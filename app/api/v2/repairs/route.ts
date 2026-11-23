import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,checkOrigin,stagingAuthEnabled} from '../../../../lib/cloud-identity'
import {postgresQuery} from '../../../../lib/db/postgres'
export const dynamic='force-dynamic'
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
const uuid=(s:unknown):s is string=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
const label=(s:unknown,min:number,max:number):s is string=>typeof s==='string'&&s.trim().length>=min&&s.trim().length<=max
async function permission(accountId:string,propertyId:string){
 const p=await postgresQuery<{role:string}>(`SELECT m.role FROM stayhub.property_memberships m JOIN stayhub.properties p ON p.id=m.property_id
 WHERE m.account_id=$1 AND m.property_id=$2 AND p.status<>'suspended'`,[accountId,propertyId])
 const owner=p.rows.some(x=>['owner','admin'].includes(x.role))
 const rooms=await postgresQuery<{unit_id:string}>(`SELECT s.unit_id FROM stayhub.stays s JOIN stayhub.properties p ON p.id=s.property_id
 WHERE s.property_id=$1 AND s.account_id=$2 AND p.status<>'suspended'
 AND s.starts_at<=now() AND (s.ends_at IS NULL OR s.ends_at>now())`,[propertyId,accountId])
 return owner||rooms.rowCount?{owner,units:rooms.rows.map(x=>x.unit_id)}:null
}
export async function GET(req:NextRequest){
 if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
 const account=await accountFromSession()
 if(!account)return reply({error:'Please sign in'},401)
 const propertyId=req.nextUrl.searchParams.get('propertyId')
 if(!uuid(propertyId))return reply({error:'Invalid property'},400)
 try{
  const access=await permission(account.id,propertyId)
  if(!access)return reply({error:'Forbidden'},403)
  const sql=`SELECT r.id,r.unit_id,u.name AS unit_name,r.account_id,r.title,r.detail,r.status,
   r.appointment_at,r.appointment_reply,r.created_at,r.updated_at,r.closed_at
   FROM stayhub.repair_requests r JOIN stayhub.units u ON u.property_id=r.property_id AND u.id=r.unit_id
   WHERE r.property_id=$1 ${access.owner?'':'AND r.account_id=$2'} ORDER BY r.created_at DESC LIMIT 200`
  const q=await postgresQuery(sql,access.owner?[propertyId]:[propertyId,account.id])
  return reply({items:q.rows,owner:access.owner})
 }catch{return reply({error:'Repair list unavailable'},503)}
}
export async function POST(req:NextRequest){
 if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
 if(!checkOrigin(req))return reply({error:'Invalid origin'},403)
 if(Number(req.headers.get('content-length')||0)>8192)return reply({error:'Payload too large'},413)
 const account=await accountFromSession()
 if(!account)return reply({error:'Please sign in'},401)
 let body:Record<string,unknown>
 try{body=await req.json();if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid')}
 catch{return reply({error:'Invalid JSON'},400)}
 const propertyId=body.propertyId,action=body.action
 if(!uuid(propertyId)||!label(action,1,40))return reply({error:'Invalid request'},400)
 try{
  const access=await permission(account.id,propertyId)
  if(!access)return reply({error:'Forbidden'},403)
  if(action==='create'){
   if(!uuid(body.unitId)||!access.units.includes(body.unitId)||!label(body.title,1,160)||!label(body.detail,1,4000))
    return reply({error:'Invalid repair'},400)
   const r=await postgresQuery<{id:string}>(`INSERT INTO stayhub.repair_requests(property_id,unit_id,account_id,title,detail)
    VALUES($1,$2,$3,$4,$5) RETURNING id`,[propertyId,body.unitId,account.id,body.title.trim(),body.detail.trim()])
   return reply({id:r.rows[0].id},201)
  }
  if(!uuid(body.id))return reply({error:'Invalid repair ID'},400)
  if(action==='respond'){
   if(!['confirmed','change_requested'].includes(String(body.response)))return reply({error:'Invalid response'},400)
   const r=await postgresQuery(`UPDATE stayhub.repair_requests SET appointment_reply=$4,updated_at=now(),updated_by=$3
    WHERE property_id=$1 AND id=$2 AND account_id=$3 AND status='scheduled' RETURNING id`,
    [propertyId,body.id,account.id,body.response])
   return r.rowCount?reply({ok:true}):reply({error:'Repair not scheduled for this user'},409)
  }
  if(!access.owner)return reply({error:'Forbidden'},403)
  if(action==='schedule'){
   if(typeof body.appointmentAt!=='string'||!Number.isFinite(Date.parse(body.appointmentAt)))return reply({error:'Invalid appointment'},400)
   const date=new Date(body.appointmentAt)
   if(date.getTime()<=Date.now()||date.getTime()>Date.now()+180*86400_000)return reply({error:'Appointment outside allowed range'},400)
   const r=await postgresQuery(`UPDATE stayhub.repair_requests
     SET status='scheduled',appointment_at=$4,appointment_reply=NULL,updated_by=$3,updated_at=now()
     WHERE property_id=$1 AND id=$2 AND status IN ('accepted','scheduled') RETURNING id`,
     [propertyId,body.id,account.id,date.toISOString()])
   return r.rowCount?reply({ok:true}):reply({error:'Cannot schedule this repair'},409)
  }
  if(action==='transition'){
   const next=body.status
   const previous:Record<string,string>={accepted:'submitted',in_progress:'scheduled',completed:'in_progress',closed:'completed'}
   if(typeof next!=='string'||!previous[next])return reply({error:'Invalid transition'},400)
   const r=await postgresQuery(`UPDATE stayhub.repair_requests SET status=$3,updated_at=now(),updated_by=$4,
     closed_at=CASE WHEN $3='closed' THEN now() ELSE closed_at END
     WHERE property_id=$1 AND id=$2 AND status=$5 RETURNING id`,
     [propertyId,body.id,next,account.id,previous[next]])
   return r.rowCount?reply({ok:true}):reply({error:'Status changed or invalid transition'},409)
  }
  return reply({error:'Unknown action'},404)
 }catch(e){
  if(['23503','23505','23514'].includes((e as {code?:string}).code||''))return reply({error:'Repair identity or state conflict'},409)
  return reply({error:'Repair service unavailable'},503)
 }
}
