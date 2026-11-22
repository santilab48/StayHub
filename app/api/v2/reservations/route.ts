import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,checkOrigin,stagingAuthEnabled} from '../../../../lib/cloud-identity'
import {postgresQuery,withPostgresTransaction} from '../../../../lib/db/postgres'
import {endStay} from '../../../../lib/stay-lifecycle'

export const dynamic='force-dynamic'
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}})
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const date=(value:unknown):value is string=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false
  const parsed=new Date(value+'T00:00:00Z')
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value
}
async function canManage(accountId:string,propertyId:string){
  const r=await postgresQuery(`SELECT 1 FROM stayhub.property_memberships
    WHERE account_id=$1 AND property_id=$2 AND role IN ('owner','admin')`,
    [accountId,propertyId])
  return r.rowCount===1
}
async function preflight(client:import('pg').PoolClient,propertyId:string,unitId:string,arrival:string,departure:string){
  const locked=await client.query(`SELECT id FROM stayhub.units
    WHERE property_id=$1 AND id=$2 AND active=true FOR UPDATE`,[propertyId,unitId])
  if(!locked.rowCount)return 'invalid_unit'
  const b=await client.query(`SELECT 1 FROM stayhub.unit_blocks
    WHERE property_id=$1 AND unit_id=$2
      AND starts_at < ($4::date + time '12:00') AT TIME ZONE 'Asia/Bangkok'
      AND ends_at > ($3::date + time '12:00') AT TIME ZONE 'Asia/Bangkok'
    LIMIT 1`,[propertyId,unitId,arrival,departure])
  if(b.rowCount)return 'blocked'
  // Until reservation-backed check-in is built, never allocate rooms with an
  // active stay; this conservative rule prevents double-booking.
  const occupied=await client.query(`SELECT 1 FROM stayhub.stays
    WHERE property_id=$1 AND unit_id=$2 AND starts_at<now()
      AND (ends_at IS NULL OR ends_at>now()) LIMIT 1`,[propertyId,unitId])
  if(occupied.rowCount)return 'occupied'
  const conflict=await client.query(`SELECT 1 FROM stayhub.reservations
    WHERE property_id=$1 AND unit_id=$2
      AND status IN ('confirmed','checked_in')
      AND arrival_date<$4::date AND departure_date>$3::date LIMIT 1`,
    [propertyId,unitId,arrival,departure])
  if(conflict.rowCount)return 'overlap'
  return 'ok'
}
export async function GET(req:NextRequest){
  if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
  const account=await accountFromSession()
  if(!account)return reply({error:'Please sign in'},401)
  const propertyId=req.nextUrl.searchParams.get('propertyId')
  if(!uuid(propertyId)||!await canManage(account.id,propertyId))return reply({error:'Forbidden'},403)
  const r=await postgresQuery(`SELECT r.id,r.unit_id,u.name AS unit_name,
    r.arrival_date,r.departure_date,r.status,r.total_amount,r.created_at,st.id AS stay_id
    FROM stayhub.reservations r JOIN stayhub.units u ON u.id=r.unit_id AND u.property_id=r.property_id
    LEFT JOIN stayhub.stays st ON st.reservation_id=r.id AND st.property_id=r.property_id
    WHERE r.property_id=$1 ORDER BY r.arrival_date DESC LIMIT 300`,[propertyId])
  return reply({items:r.rows})
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
  if(!uuid(propertyId)||!await canManage(account.id,propertyId))return reply({error:'Forbidden'},403)
  try{
    if(data.action==='create'){
      if(!uuid(data.unitId)||!date(data.arrival)||!date(data.departure))
        return reply({error:'Invalid room or dates'},400)
      const arrival=data.arrival,departure=data.departure,unitId=data.unitId
      const nights=(Date.parse(departure)-Date.parse(arrival))/86400000
      if(nights<1||nights>365)return reply({error:'Reservation must be 1–365 nights'},400)
      const bangkokToday=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
      if(arrival<bangkokToday)return reply({error:'Arrival date is in the past'},400)
      const idempotency=req.headers.get('idempotency-key')
      if(!idempotency||idempotency.length>120||!/^[-\w]{12,120}$/.test(idempotency))
        return reply({error:'Idempotency-Key header required (12–120 safe characters)'},400)
      const amount=data.amount
      if(amount!==undefined&&amount!==null&&(
        typeof amount!=='number'||!Number.isFinite(amount)||amount<0||amount>100000000
      ))return reply({error:'Invalid total'},400)
      const result=await withPostgresTransaction(async client=>{
        const existing=await client.query(`SELECT id,unit_id,arrival_date,departure_date,total_amount,status
          FROM stayhub.reservations WHERE property_id=$1 AND idempotency_key=$2 FOR UPDATE`,
          [propertyId,idempotency])
        if(existing.rowCount)return {status:'existing',item:existing.rows[0]}
        const check=await preflight(client,propertyId,unitId,arrival,departure)
        if(check!=='ok'){
          // When an identical request races the first insert, the unit lock
          // makes its committed idempotency record visible now.
          const replay=await client.query(`SELECT id,unit_id,arrival_date,departure_date,total_amount,status
            FROM stayhub.reservations WHERE property_id=$1 AND idempotency_key=$2`,
            [propertyId,idempotency])
          if(replay.rowCount)return {status:'existing',item:replay.rows[0]}
          return {status:check}
        }
        const created=await client.query(`INSERT INTO stayhub.reservations
          (property_id,unit_id,arrival_date,departure_date,status,total_amount,idempotency_key)
          VALUES($1,$2,$3,$4,'confirmed',$5,$6) RETURNING id`,
          [propertyId,unitId,arrival,departure,amount??null,idempotency])
        return {status:'created',id:created.rows[0].id}
      })
      if(result.status==='existing'){
        const previous=result.item
        if(previous.unit_id!==unitId||
           new Date(previous.arrival_date as string).toISOString().slice(0,10)!==arrival||
           new Date(previous.departure_date as string).toISOString().slice(0,10)!==departure||
           (previous.total_amount===null?null:Number(previous.total_amount))!==(amount??null))
          return reply({error:'Idempotency key reused with different reservation'},409)
        return reply({id:previous.id,status:previous.status,replayed:true})
      }
      return result.status==='created'?reply(result,201):reply({error:result.status},409)
    }
    if(data.action==='check-in'){
      if(!uuid(data.reservationId)||!uuid(data.joinRequestId))return reply({error:'Valid reservation and QR join request required'},400)
      const reservationId=data.reservationId,joinRequestId=data.joinRequestId
      const result=await withPostgresTransaction(async client=>{
        // Lock the physical room first; other admissions and booking creation
        // also lock this row, serializing capacity decisions across requests.
        const seed=await client.query<{unit_id:string}>(`
          SELECT unit_id FROM stayhub.reservations
          WHERE id=$1 AND property_id=$2`,[reservationId,propertyId])
        if(!seed.rowCount)return {status:'not_found'}
        const lock=await client.query(`SELECT id FROM stayhub.units
          WHERE id=$1 AND property_id=$2 AND active=true FOR UPDATE`,[seed.rows[0].unit_id,propertyId])
        if(!lock.rowCount)return {status:'inactive_unit'}
        const reservation=await client.query<{id:string;unit_id:string;status:string;guest_account_id:string|null;arrival_date:string;departure_date:string}>(`
          SELECT id,unit_id,status,guest_account_id,arrival_date,departure_date
          FROM stayhub.reservations WHERE id=$1 AND property_id=$2 FOR UPDATE`,
          [reservationId,propertyId])
        if(!reservation.rowCount||reservation.rows[0].unit_id!==seed.rows[0].unit_id)return {status:'reservation_changed'}
        const item=reservation.rows[0]
        if(item.status!=='confirmed')return {status:'not_confirmed'}
        const day=await client.query<{today:string}>(`SELECT to_char(now() AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD') AS today`)
        const today=day.rows[0].today
        if(new Date(item.arrival_date).toISOString().slice(0,10)>today||
           new Date(item.departure_date).toISOString().slice(0,10)<=today)return {status:'outside_stay_dates'}
        const qr=await client.query<{id:string;account_id:string;unit_id:string|null;status:string}>(`
          SELECT id,account_id,unit_id,status FROM stayhub.join_requests
          WHERE id=$1 AND property_id=$2 FOR UPDATE`,[joinRequestId,propertyId])
        if(!qr.rowCount||qr.rows[0].status!=='pending')return {status:'request_not_pending'}
        if(qr.rows[0].unit_id&&qr.rows[0].unit_id!==item.unit_id)return {status:'wrong_room'}
        const guest=qr.rows[0].account_id
        const role=await client.query<{role:string}>(`SELECT role FROM stayhub.property_memberships
          WHERE property_id=$1 AND account_id=$2`,[propertyId,guest])
        if(role.rows.some(x=>!['resident','guest'].includes(x.role)))return {status:'privileged_role'}
        const blocked=await client.query(`SELECT 1 FROM stayhub.unit_blocks
          WHERE property_id=$1 AND unit_id=$2 AND starts_at<=now() AND ends_at>now() LIMIT 1`,[propertyId,item.unit_id])
        if(blocked.rowCount)return {status:'blocked'}
        const cleaning=await client.query(`SELECT 1 FROM stayhub.housekeeping_tasks
          WHERE property_id=$1 AND unit_id=$2 AND status IN ('pending','in_progress') LIMIT 1`,[propertyId,item.unit_id])
        if(cleaning.rowCount)return {status:'cleaning'}
        const occupancy=await client.query<{n:number;capacity:number}>(`
          SELECT (SELECT count(*)::integer FROM stayhub.stays
            WHERE property_id=$1 AND unit_id=$2 AND starts_at<=now()
            AND (ends_at IS NULL OR ends_at>now())) AS n, capacity
          FROM stayhub.units WHERE property_id=$1 AND id=$2`,[propertyId,item.unit_id])
        if(occupancy.rows[0].n>=occupancy.rows[0].capacity)return {status:'full'}
        const existing=await client.query(`SELECT 1 FROM stayhub.stays
          WHERE property_id=$1 AND account_id=$2 AND (ends_at IS NULL OR ends_at>now())
          LIMIT 1`,[propertyId,guest])
        if(existing.rowCount)return {status:'guest_already_checked_in'}
        await client.query(`UPDATE stayhub.reservations
          SET status='checked_in',guest_account_id=$3 WHERE id=$1 AND property_id=$2`,[reservationId,propertyId,guest])
        const stay=await client.query<{id:string}>(`INSERT INTO stayhub.stays
          (property_id,unit_id,account_id,join_request_id,reservation_id)
          VALUES($1,$2,$3,$4,$5) RETURNING id`,
          [propertyId,item.unit_id,guest,joinRequestId,reservationId])
        await client.query(`INSERT INTO stayhub.property_memberships(property_id,account_id,role)
          VALUES($1,$2,'guest') ON CONFLICT(property_id,account_id) DO UPDATE SET role='guest'
          WHERE stayhub.property_memberships.role IN ('guest','resident')`,[propertyId,guest])
        await client.query(`UPDATE stayhub.join_requests SET status='approved',unit_id=$3,
          reviewed_by=$4,reviewed_at=now() WHERE id=$1 AND property_id=$2`,
          [joinRequestId,propertyId,item.unit_id,account.id])
        await client.query(`INSERT INTO stayhub.stay_events
          (property_id,stay_id,account_id,actor_account_id,event_type,to_unit_id)
          VALUES($1,$2,$3,$4,'approved',$5)`,[propertyId,stay.rows[0].id,guest,account.id,item.unit_id])
        return {status:'checked_in',stayId:stay.rows[0].id}
      })
      return result.status==='checked_in'?reply(result,201):reply({error:result.status},409)
    }
    if(data.action==='check-out'){
      if(!uuid(data.reservationId))return reply({error:'Invalid reservation ID'},400)
      const reservationId=data.reservationId
      const result=await withPostgresTransaction(async client=>{
        const seed=await client.query<{unit_id:string}>(`SELECT unit_id FROM stayhub.reservations
          WHERE id=$1 AND property_id=$2`,[reservationId,propertyId])
        if(!seed.rowCount)return 'not_found'
        await client.query('SELECT id FROM stayhub.units WHERE property_id=$1 AND id=$2 FOR UPDATE',
          [propertyId,seed.rows[0].unit_id])
        const record=await client.query<{status:string;unit_id:string}>(`
          SELECT status,unit_id FROM stayhub.reservations
          WHERE id=$1 AND property_id=$2 FOR UPDATE`,[reservationId,propertyId])
        if(!record.rowCount||record.rows[0].unit_id!==seed.rows[0].unit_id||
           record.rows[0].status!=='checked_in')return 'not_checked_in'
        const stay=await client.query<{id:string}>(`SELECT id FROM stayhub.stays
          WHERE property_id=$1 AND reservation_id=$2 AND (ends_at IS NULL OR ends_at>now())
          FOR UPDATE`,[propertyId,reservationId])
        if(stay.rowCount!==1)return 'stay_missing'
        const activeLease=await client.query(`SELECT 1 FROM stayhub.leases
          WHERE property_id=$1 AND stay_id=$2 AND status='active' LIMIT 1`,
          [propertyId,stay.rows[0].id])
        if(activeLease.rowCount)return 'terminate_lease_first'
        const ended=await endStay(client,propertyId,stay.rows[0].id,account.id)
        if(!ended)return 'stay_not_active'
        await client.query(`UPDATE stayhub.reservations SET status='checked_out'
          WHERE property_id=$1 AND id=$2`,[propertyId,reservationId])
        return 'checked_out'
      })
      return result==='checked_out'?reply({status:result}):reply({error:result},409)
    }
    if(data.action==='cancel'){
      if(!uuid(data.reservationId))return reply({error:'Invalid reservation ID'},400)
      const updated=await postgresQuery(`UPDATE stayhub.reservations SET status='cancelled'
        WHERE id=$1 AND property_id=$2 AND status IN ('pending','confirmed')
        RETURNING id`,[data.reservationId,propertyId])
      return updated.rowCount?reply({status:'cancelled'}):reply({error:'Not cancellable'},409)
    }
    return reply({error:'Unknown action'},404)
  }catch(e){
    if((e as {code?:string}).code==='23P01')return reply({error:'Reservation dates overlap'},409)
    if((e as {code?:string}).code==='23505')return reply({error:'Duplicate reservation request'},409)
    return reply({error:'Reservation unavailable'},503)
  }
}
