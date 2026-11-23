import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,checkOrigin,stagingAuthEnabled} from '../../../../lib/cloud-identity'
import {postgresQuery} from '../../../../lib/db/postgres'
export const dynamic='force-dynamic'
const send=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}})
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const string=(v:unknown,min:number,max:number)=>typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max
const money=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1000000&&Math.round(v*100)===v*100
type Access={owner:boolean;units:string[]}
async function getAccess(accountId:string,propertyId:string):Promise<Access|null>{
 const a=await postgresQuery<{role:string}>(`SELECT m.role FROM stayhub.property_memberships m
 JOIN stayhub.properties p ON p.id=m.property_id WHERE m.property_id=$1 AND m.account_id=$2
 AND p.status<>'suspended'`,[propertyId,accountId])
 const owner=a.rows.some(r=>r.role==='owner'||r.role==='admin')
 const stays=await postgresQuery<{unit_id:string}>(`SELECT unit_id FROM stayhub.stays
 WHERE property_id=$1 AND account_id=$2 AND starts_at<=now()
 AND (ends_at IS NULL OR ends_at>now())`,[propertyId,accountId])
 const units=stays.rows.map(r=>r.unit_id)
 return owner||units.length?{owner,units}:null
}
async function unitAllowed(propertyId:string,unitId:string,access:Access){
 if(!uuid(unitId)||(!access.owner&&!access.units.includes(unitId)))return false
 const r=await postgresQuery('SELECT 1 FROM stayhub.units WHERE property_id=$1 AND id=$2 AND active=true',[propertyId,unitId])
 return !!r.rowCount
}
export async function GET(req:NextRequest){
 if(!stagingAuthEnabled())return send({error:'Not enabled'},503)
 const account=await accountFromSession()
 if(!account)return send({error:'Please sign in'},401)
 const propertyId=req.nextUrl.searchParams.get('propertyId')
 const kind=req.nextUrl.searchParams.get('kind')
 if(!uuid(propertyId))return send({error:'Invalid property'},400)
 try{
  const access=await getAccess(account.id,propertyId)
  if(!access)return send({error:'Forbidden'},403)
  const scoped=access.owner
  let sql:string
  const args:unknown[]=[propertyId]
  if(kind==='settings'){
   if(!scoped)return send({error:'Forbidden'},403)
   sql='SELECT water_rate,electric_rate,due_day,late_fee FROM stayhub.property_settings WHERE property_id=$1'
  }else if(kind==='announcements'){
   sql=`SELECT id,unit_id,title,body,pinned,expires_at,created_at FROM stayhub.announcements
   WHERE property_id=$1 AND archived_at IS NULL
   ${scoped?'':'AND (unit_id IS NULL OR unit_id=ANY($2::uuid[])) AND (expires_at IS NULL OR expires_at>now())'}
   ORDER BY pinned DESC,created_at DESC LIMIT 100`
   if(!scoped)args.push(access.units)
  }else if(kind==='parcels'){
   sql=`SELECT id,unit_id,carrier,tracking,status,received_at FROM stayhub.parcels WHERE property_id=$1
   ${scoped?'':'AND unit_id=ANY($2::uuid[])'} ORDER BY received_at DESC LIMIT 200`
   if(!scoped)args.push(access.units)
  }else if(kind==='vehicles'){
   sql=`SELECT id,unit_id,plate,vehicle_type,status,created_at FROM stayhub.vehicles WHERE property_id=$1
   ${scoped?'':'AND unit_id=ANY($2::uuid[])'} ORDER BY created_at DESC LIMIT 200`
   if(!scoped)args.push(access.units)
  }else if(kind==='drivers'){
   sql=`SELECT id,name,phone,vehicle_type,active FROM stayhub.drivers WHERE property_id=$1
   ${scoped?'':'AND active=true'} ORDER BY created_at DESC LIMIT 100`
  }else if(kind==='rides'){
   sql=`SELECT id,driver_id,unit_id,note,status,requested_at,account_id FROM stayhub.ride_requests
   WHERE property_id=$1 ${scoped?'':'AND account_id=$2'} ORDER BY requested_at DESC LIMIT 200`
   if(!scoped)args.push(account.id)
  }else if(kind==='documents'){
   sql=`SELECT id,unit_id,title,description,created_at FROM stayhub.room_documents
   WHERE property_id=$1 ${scoped?'':'AND unit_id=ANY($2::uuid[])'}
   ORDER BY created_at DESC LIMIT 200`
   if(!scoped)args.push(access.units)
  }else return send({error:'Unknown module'},404)
  const r=await postgresQuery(sql,args)
  return send({items:r.rows,owner:scoped,units:access.units})
 }catch{return send({error:'Module unavailable'},503)}
}
export async function POST(req:NextRequest){
 if(!stagingAuthEnabled())return send({error:'Not enabled'},503)
 if(!checkOrigin(req))return send({error:'Invalid origin'},403)
 if(Number(req.headers.get('content-length')||0)>8192)return send({error:'Payload too large'},413)
 const account=await accountFromSession()
 if(!account)return send({error:'Please sign in'},401)
 let b:Record<string,unknown>
 try{b=await req.json();if(!b||typeof b!=='object'||Array.isArray(b))throw Error('json')}
 catch{return send({error:'Invalid JSON'},400)}
 if(!uuid(b.propertyId)||!string(b.action,3,60))return send({error:'Invalid request'},400)
 const propertyId=b.propertyId
 const action=b.action
 try{
  const access=await getAccess(account.id,propertyId)
  if(!access)return send({error:'Forbidden'},403)
  const privileged=['settings-save','announcement-add','announcement-archive','parcel-add','parcel-status','vehicle-review','driver-add','driver-active','ride-status','document-add','document-remove']
  if(privileged.includes(action)&&!access.owner)return send({error:'Forbidden'},403)
  if(action==='settings-save'){
   const {waterRate,electricRate,dueDay,lateFee}=b
   if(!money(waterRate)||!money(electricRate)||!money(lateFee)||!Number.isInteger(dueDay)||Number(dueDay)<1||Number(dueDay)>28)return send({error:'Invalid settings'},400)
   await postgresQuery(`INSERT INTO stayhub.property_settings(property_id,water_rate,electric_rate,due_day,late_fee,updated_by)
   VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(property_id) DO UPDATE
   SET water_rate=EXCLUDED.water_rate,electric_rate=EXCLUDED.electric_rate,
   due_day=EXCLUDED.due_day,late_fee=EXCLUDED.late_fee,updated_by=EXCLUDED.updated_by,updated_at=now()`,
   [propertyId,waterRate,electricRate,dueDay,lateFee,account.id])
  }else if(action==='announcement-add'){
   if(!string(b.title,1,160)||!string(b.body,1,4000)||!(b.unitId===null||b.unitId===undefined||await unitAllowed(propertyId,b.unitId as string,access)))
    return send({error:'Invalid announcement'},400)
   await postgresQuery(`INSERT INTO stayhub.announcements(property_id,unit_id,title,body,pinned,created_by)
   VALUES($1,$2,$3,$4,$5,$6)`,[propertyId,b.unitId||null,(b.title as string).trim(),(b.body as string).trim(),b.pinned===true,account.id])
  }else if(action==='announcement-archive'){
   if(!uuid(b.id))return send({error:'Invalid ID'},400)
   const r=await postgresQuery('UPDATE stayhub.announcements SET archived_at=now() WHERE property_id=$1 AND id=$2 AND archived_at IS NULL RETURNING id',[propertyId,b.id])
   if(!r.rowCount)return send({error:'Not found'},404)
  }else if(action==='parcel-add'){
   if(!uuid(b.unitId)||!await unitAllowed(propertyId,b.unitId,access)||!string(b.carrier,1,100)||!(b.tracking===undefined||string(b.tracking,0,160)))
    return send({error:'Invalid parcel'},400)
   await postgresQuery(`INSERT INTO stayhub.parcels(property_id,unit_id,carrier,tracking,created_by)
   VALUES($1,$2,$3,$4,$5)`,[propertyId,b.unitId,(b.carrier as string).trim(),typeof b.tracking==='string'?b.tracking.trim():'',account.id])
  }else if(action==='parcel-status'){
   if(!uuid(b.id)||!['picked_up','returned'].includes(String(b.status)))return send({error:'Invalid status'},400)
   const r=await postgresQuery(`UPDATE stayhub.parcels SET status=$3,resolved_at=now(),updated_by=$4
   WHERE property_id=$1 AND id=$2 AND status='waiting' RETURNING id`,[propertyId,b.id,b.status,account.id])
   if(!r.rowCount)return send({error:'Parcel not waiting'},409)
  }else if(action==='vehicle-add'){
   if(!uuid(b.unitId)||!await unitAllowed(propertyId,b.unitId,access)||!string(b.plate,2,30)||!string(b.vehicleType,1,60))
    return send({error:'Invalid vehicle'},400)
   await postgresQuery(`INSERT INTO stayhub.vehicles(property_id,unit_id,plate,vehicle_type,created_by)
   VALUES($1,$2,$3,$4,$5)`,[propertyId,b.unitId,(b.plate as string).trim(),(b.vehicleType as string).trim(),account.id])
  }else if(action==='vehicle-review'){
   if(!uuid(b.id)||!['approved','revoked'].includes(String(b.status)))return send({error:'Invalid review'},400)
   const r=await postgresQuery('UPDATE stayhub.vehicles SET status=$3,reviewed_by=$4,updated_at=now() WHERE property_id=$1 AND id=$2 RETURNING id',
    [propertyId,b.id,b.status,account.id])
   if(!r.rowCount)return send({error:'Not found'},404)
  }else if(action==='driver-add'){
   if(!string(b.name,1,120)||!string(b.phone,5,30)||!string(b.vehicleType,1,60))return send({error:'Invalid driver'},400)
   await postgresQuery('INSERT INTO stayhub.drivers(property_id,name,phone,vehicle_type,created_by) VALUES($1,$2,$3,$4,$5)',
    [propertyId,(b.name as string).trim(),(b.phone as string).trim(),(b.vehicleType as string).trim(),account.id])
  }else if(action==='driver-active'){
   if(!uuid(b.id)||typeof b.active!=='boolean')return send({error:'Invalid driver'},400)
   const r=await postgresQuery('UPDATE stayhub.drivers SET active=$3 WHERE property_id=$1 AND id=$2 RETURNING id',[propertyId,b.id,b.active])
   if(!r.rowCount)return send({error:'Not found'},404)
  }else if(action==='ride-add'){
   if(!uuid(b.unitId)||!access.units.includes(b.unitId)||!(b.driverId===null||b.driverId===undefined||uuid(b.driverId))||!string(b.note||'',0,500))
    return send({error:'Invalid ride request'},400)
   if(b.driverId){
    const exists=await postgresQuery('SELECT 1 FROM stayhub.drivers WHERE property_id=$1 AND id=$2 AND active=true',[propertyId,b.driverId])
    if(!exists.rowCount)return send({error:'Driver unavailable'},409)
   }
   await postgresQuery('INSERT INTO stayhub.ride_requests(property_id,driver_id,unit_id,account_id,note) VALUES($1,$2,$3,$4,$5)',
    [propertyId,b.driverId||null,b.unitId,account.id,b.note||''])
  }else if(action==='ride-status'){
   if(!uuid(b.id)||!['accepted','on_the_way','arrived','completed','cancelled'].includes(String(b.status)))return send({error:'Invalid status'},400)
   const r=await postgresQuery('UPDATE stayhub.ride_requests SET status=$3,updated_at=now() WHERE property_id=$1 AND id=$2 AND status<>\'completed\' RETURNING id',
    [propertyId,b.id,b.status])
   if(!r.rowCount)return send({error:'Not found'},404)
  }else if(action==='document-add'){
   if(!uuid(b.unitId)||!await unitAllowed(propertyId,b.unitId,access)||!string(b.title,1,160)||!string(b.description||'',0,4000))
    return send({error:'Invalid document'},400)
   await postgresQuery('INSERT INTO stayhub.room_documents(property_id,unit_id,title,description,created_by) VALUES($1,$2,$3,$4,$5)',
    [propertyId,b.unitId,(b.title as string).trim(),b.description||'',account.id])
  }else if(action==='document-remove'){
   if(!uuid(b.id))return send({error:'Invalid ID'},400)
   const r=await postgresQuery('DELETE FROM stayhub.room_documents WHERE property_id=$1 AND id=$2 RETURNING id',[propertyId,b.id])
   if(!r.rowCount)return send({error:'Not found'},404)
  }else return send({error:'Unknown action'},404)
  return send({ok:true},201)
 }catch(e){
  if(['23503','23505','23514'].includes((e as {code?:string}).code||''))return send({error:'Item conflicts with property or existing record'},409)
  return send({error:'Module action unavailable'},503)
 }
}
