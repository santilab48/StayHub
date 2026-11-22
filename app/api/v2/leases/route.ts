import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,checkOrigin,stagingAuthEnabled} from '../../../../lib/cloud-identity'
import {postgresQuery,withPostgresTransaction} from '../../../../lib/db/postgres'
export const dynamic='force-dynamic'
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}})
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const date=(v:unknown):v is string=>{
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false
  const d=new Date(v+'T00:00:00Z')
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v
}
const money=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100000000&&Math.round(v*100)===v*100
async function ownerOf(accountId:string,propertyId:string){
  const r=await postgresQuery(`SELECT 1 FROM stayhub.property_memberships
    WHERE account_id=$1 AND property_id=$2 AND role IN ('owner','admin')`,[accountId,propertyId])
  return r.rowCount===1
}
export async function GET(req:NextRequest){
  if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
  const account=await accountFromSession()
  if(!account)return reply({error:'Please sign in'},401)
  const propertyId=req.nextUrl.searchParams.get('propertyId')
  if(!uuid(propertyId)||!await ownerOf(account.id,propertyId))return reply({error:'Forbidden'},403)
  try{
    const r=await postgresQuery(`SELECT l.id,l.stay_id,l.unit_id,l.account_id,
      u.name AS unit_name,l.starts_on,l.ends_on,l.monthly_rent,l.security_deposit,l.status,l.created_at
      FROM stayhub.leases l JOIN stayhub.units u ON u.property_id=l.property_id AND u.id=l.unit_id
      WHERE l.property_id=$1 ORDER BY l.created_at DESC LIMIT 300`,[propertyId])
    return reply({items:r.rows})
  }catch{return reply({error:'Lease list unavailable'},503)}
}
export async function POST(req:NextRequest){
  if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
  if(!checkOrigin(req))return reply({error:'Invalid origin'},403)
  if(Number(req.headers.get('content-length')||0)>8192)return reply({error:'Payload too large'},413)
  const account=await accountFromSession()
  if(!account)return reply({error:'Please sign in'},401)
  let data:Record<string,unknown>
  try{
    data=await req.json()
    if(!data||typeof data!=='object'||Array.isArray(data))throw Error('invalid')
  }catch{return reply({error:'Invalid JSON'},400)}
  const propertyId=data.propertyId
  if(!uuid(propertyId)||!await ownerOf(account.id,propertyId))return reply({error:'Forbidden'},403)
  try{
    if(data.action==='create'){
      if(!uuid(data.stayId)||!date(data.startsOn)||
        (data.endsOn!==null&&data.endsOn!==undefined&&!date(data.endsOn))||
        !money(data.monthlyRent)||
        (data.securityDeposit!==undefined&&!money(data.securityDeposit)))
        return reply({error:'Invalid lease terms'},400)
      const startsOn=data.startsOn
      const endsOn=data.endsOn??null
      if(typeof endsOn==='string'&&endsOn<startsOn)return reply({error:'End date precedes start date'},400)
      const result=await withPostgresTransaction(async client=>{
        // Lock the approved stay; never use account_id or unit_id sent by a browser.
        const stay=await client.query<{id:string;account_id:string;unit_id:string}>(`
          SELECT id,account_id,unit_id FROM stayhub.stays
          WHERE id=$1 AND property_id=$2 AND starts_at<=now()
            AND (ends_at IS NULL OR ends_at>now()) FOR UPDATE`,[data.stayId,propertyId])
        if(!stay.rowCount)return {status:'no_active_stay'}
        const r=await client.query<{id:string}>(`INSERT INTO stayhub.leases
          (property_id,stay_id,account_id,unit_id,starts_on,ends_on,monthly_rent,security_deposit,created_by)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [propertyId,stay.rows[0].id,stay.rows[0].account_id,stay.rows[0].unit_id,
            startsOn,endsOn,data.monthlyRent,data.securityDeposit??0,account.id])
        return {status:'created',id:r.rows[0].id}
      })
      return result.status==='created'?reply(result,201):reply({error:result.status},409)
    }
    if(data.action==='terminate'){
      if(!uuid(data.leaseId))return reply({error:'Invalid lease ID'},400)
      const r=await postgresQuery(`UPDATE stayhub.leases SET status='terminated',terminated_at=now()
        WHERE id=$1 AND property_id=$2 AND status='active' RETURNING id`,[data.leaseId,propertyId])
      return r.rowCount?reply({status:'terminated'}):reply({error:'Lease not active'},409)
    }
    return reply({error:'Unknown action'},404)
  }catch(e){
    if((e as {code?:string}).code==='23505')return reply({error:'An active lease already exists for this stay'},409)
    if((e as {code?:string}).code==='23503')return reply({error:'Mismatched property/stay identity'},409)
    return reply({error:'Lease service unavailable'},503)
  }
}
