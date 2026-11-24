import {createHash} from 'node:crypto'
import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,checkOrigin,stagingAuthEnabled} from '../../../../lib/cloud-identity'
import {withPostgresTransaction} from '../../../../lib/db/postgres'
import {lockedBillingIdentity,exclusiveMonthlyStay} from '../../../../lib/db/billing-identity'
import {canManageProperty,periodDate,requestKey,uuid} from '../../../../lib/db/billing-request'
import {cents,formatCents} from '../../../../lib/db/billing-calculation'
import {billHistoryArgs,billScope,parseBillHistory} from '../../../../lib/db/billing-history'

export const dynamic='force-dynamic'
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}})
type Meter={id:string;meter_type:'water'|'electric';usage:string;unit_rate:string;amount:string}
const parseMoney=(v:string)=>cents(v)

export async function GET(req:NextRequest){
  if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
  const account=await accountFromSession()
  if(!account)return reply({error:'Please sign in'},401)
  const filter=parseBillHistory(req.nextUrl.searchParams)
  if(!filter)return reply({error:'Invalid bill filters or page'},400)
  try{
    return await withPostgresTransaction(async client=>{
      const manage=filter.propertyId!==null&&await canManageProperty(client,account.id,filter.propertyId)
      const args=billHistoryArgs(filter,manage,account.id)
      const r=await client.query(`SELECT b.id,b.property_id,b.account_id,b.period,b.total,b.status,b.unit_id,b.stay_id,b.lease_id,
        u.name AS unit_name,COALESCE(p.paid,0)::text AS paid,
        (CASE WHEN b.status='void' THEN 0 ELSE b.total-COALESCE(p.paid,0) END)::text AS outstanding
        FROM stayhub.billing_bills b
        JOIN stayhub.units u ON u.property_id=b.property_id AND u.id=b.unit_id
        LEFT JOIN LATERAL (SELECT sum(amount) AS paid FROM stayhub.billing_payments
          WHERE property_id=b.property_id AND bill_id=b.id) p ON true
        WHERE ${billScope}
        ORDER BY b.period DESC,b.created_at DESC,b.id DESC LIMIT $7 OFFSET $8`,
        [...args,filter.limit+1,filter.offset])
      return reply({items:r.rows.slice(0,filter.limit),page:filter.offset/filter.limit+1,
        limit:filter.limit,hasMore:r.rows.length>filter.limit})
    })
  }catch{return reply({error:'Bill list unavailable'},503)}
}

export async function POST(req:NextRequest){
  if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
  if(!checkOrigin(req))return reply({error:'Invalid origin'},403)
  if(Number(req.headers.get('content-length')||0)>8192)return reply({error:'Payload too large'},413)
  const account=await accountFromSession()
  if(!account)return reply({error:'Please sign in'},401)
  let body:Record<string,unknown>
  try{body=await req.json();if(!body||typeof body!=='object'||Array.isArray(body))throw Error('bad')}
  catch{return reply({error:'Invalid JSON'},400)}
  const {propertyId,leaseId,roomContractId}=body,period=periodDate(body.period)
  const key=requestKey(req.headers.get('idempotency-key'))
  const otherAmount=body.otherAmount===undefined?'0.00':body.otherAmount
  const otherLabel=body.otherLabel===undefined?'ค่าอื่น ๆ':body.otherLabel
  const extraCents=parseMoney(otherAmount as string)
  if(!uuid(propertyId)||(uuid(leaseId)===uuid(roomContractId))||!period||!key||
     extraCents===null||
     typeof otherLabel!=='string'||otherLabel.trim().length<1||otherLabel.trim().length>120||
     (extraCents>0&&body.otherLabel!==undefined&&otherLabel.trim().length===0))
    return reply({error:'Invalid bill request or Idempotency-Key'},400)
  const normalizedOther=formatCents(extraCents)
  const label=normalizedOther==='0.00'?'':otherLabel.trim()
  const hash=createHash('sha256').update(JSON.stringify([propertyId,roomContractId??leaseId,period,normalizedOther,label])).digest('hex')
  try{
    const result=await withPostgresTransaction(async client=>{
      if(!await canManageProperty(client,account.id,propertyId))return {error:'forbidden'}
      if(uuid(roomContractId)){
        const seed=await client.query<{unit_id:string}>(`SELECT unit_id FROM stayhub.room_contracts WHERE id=$1 AND property_id=$2`,[roomContractId,propertyId])
        if(!seed.rowCount)return {error:'lease_not_found'}
        const unitId=seed.rows[0].unit_id
        const unit=await client.query(`SELECT 1 FROM stayhub.units WHERE property_id=$1 AND id=$2 AND active FOR UPDATE`,[propertyId,unitId])
        if(!unit.rowCount)return {error:'unit_not_found'}
        const replay=await client.query<{id:string;request_hash:string}>(`SELECT id,request_hash FROM stayhub.billing_bills WHERE property_id=$1 AND idempotency_key=$2 FOR UPDATE`,[propertyId,key])
        if(replay.rowCount)return replay.rows[0].request_hash===hash?{id:replay.rows[0].id,replayed:true}:{error:'idempotency_conflict'}
        const terms=await client.query<{id:string;rent:string;service:string;water:string;electric:string}>(`SELECT id,snapshot->>'rent' AS rent,snapshot->>'service' AS service,snapshot->>'water' AS water,snapshot->>'electric' AS electric FROM stayhub.room_contracts WHERE property_id=$1 AND unit_id=$2 AND (snapshot->>'startsOn')::date<($3::date+interval '1 month')::date AND (snapshot->>'endsOn')::date>=$3::date ORDER BY created_at DESC,id DESC LIMIT 2 FOR UPDATE`,[propertyId,unitId,period])
        if(!terms.rowCount||terms.rows[0].id!==roomContractId)return {error:'lease_outside_period'}
        if(terms.rows.length>1)return {error:'overlapping_contracts'}
        const property=await client.query<{billing_mode:string}>(`SELECT billing_mode FROM stayhub.properties WHERE id=$1`,[propertyId])
        if(property.rows[0]?.billing_mode==='nightly')return {error:'monthly_billing_disabled'}
        const duplicate=await client.query(`SELECT 1 FROM stayhub.billing_bills WHERE property_id=$1 AND unit_id=$2 AND period=$3::date`,[propertyId,unitId,period])
        if(duplicate.rowCount)return {error:'duplicate_month'}
        const t=terms.rows[0],rent=cents(t.rent),service=cents(t.service??'0'),extra=cents(normalizedOther)
        if(rent===null||service===null||extra===null)return {error:'bill_amount_out_of_range'}
        const meters=await client.query<Meter>(`SELECT id,meter_type,usage,unit_rate,amount FROM stayhub.billing_meter_readings WHERE property_id=$1 AND unit_id=$2 AND period=$3::date ORDER BY meter_type FOR UPDATE`,[propertyId,unitId,period])
        if((cents(t.water)??0)>0&&!meters.rows.some(m=>m.meter_type==='water')||(cents(t.electric)??0)>0&&!meters.rows.some(m=>m.meter_type==='electric'))return {error:'meter_readings_required'}
        const total=rent+service+extra+meters.rows.reduce((sum,m)=>sum+(cents(m.amount)??NaN),0)
        if(!Number.isSafeInteger(total)||total>999999999999)return {error:'bill_amount_out_of_range'}
        const created=await client.query<{id:string}>(`INSERT INTO stayhub.billing_bills(property_id,unit_id,room_contract_id,period,total,created_by,idempotency_key,request_hash) VALUES($1,$2,$3,$4::date,$5,$6,$7,$8) RETURNING id`,[propertyId,unitId,roomContractId,period,formatCents(total),account.id,key,hash])
        const billId=created.rows[0].id
        const insert=async(code:string,name:string,qty:string,rate:string,amount:string,readingId:string|null)=>{await client.query(`INSERT INTO stayhub.billing_bill_items(property_id,bill_id,unit_id,period,fee_code,label,quantity,unit_rate,amount,meter_reading_id) VALUES($1,$2,$3,$4::date,$5,$6,$7,$8,$9,$10)`,[propertyId,billId,unitId,period,code,name,qty,rate,amount,readingId])}
        await insert('rent','ค่าเช่าห้อง','1',formatCents(rent),formatCents(rent),null)
        for(const m of meters.rows)await insert(m.meter_type,m.meter_type==='water'?'ค่าน้ำ':'ค่าไฟ',m.usage,m.unit_rate,m.amount,m.id)
        if(service>0)await insert('other','ค่าบริการตามสัญญา','1',formatCents(service),formatCents(service),null)
        if(extra>0)await insert('other',label,'1',normalizedOther,normalizedOther,null)
        await client.query('UPDATE stayhub.billing_bills SET finalized=true WHERE id=$1 AND property_id=$2',[billId,propertyId])
        return {id:billId,replayed:false,total:formatCents(total)}
      }
      const seed=await client.query<{unit_id:string}>(`SELECT unit_id FROM stayhub.leases
        WHERE id=$1 AND property_id=$2`,[leaseId,propertyId])
      if(!seed.rowCount)return {error:'lease_not_found'}
      // Unit lock serializes generation with transfers, assignments and meter writes.
      const unit=await client.query(`SELECT 1 FROM stayhub.units WHERE property_id=$1 AND id=$2 FOR UPDATE`,
        [propertyId,seed.rows[0].unit_id])
      if(!unit.rowCount)return {error:'unit_not_found'}
      const replay=await client.query<{id:string;request_hash:string;lease_id:string;period:string}>(`
        SELECT id,request_hash,lease_id,period FROM stayhub.billing_bills
        WHERE property_id=$1 AND idempotency_key=$2 FOR UPDATE`,[propertyId,key])
      if(replay.rowCount){
        const previous=replay.rows[0]
        return previous.request_hash===hash?{id:previous.id,replayed:true}:{error:'idempotency_conflict'}
      }
      const identity=await lockedBillingIdentity(client,propertyId,leaseId)
      if(!identity||identity.unitId!==seed.rows[0].unit_id)return {error:'lease_not_active'}
      const terms=await client.query<{monthly_rent:string;starts_on:string;ends_on:string|null;ends_at:string|null}>(`
        SELECT l.monthly_rent,l.starts_on,l.ends_on,s.ends_at FROM stayhub.leases l
        JOIN stayhub.stays s ON s.property_id=l.property_id AND s.id=l.stay_id
        WHERE l.id=$1 AND l.property_id=$2 AND l.status='active'
          AND l.starts_on<($3::date+interval '1 month')::date
          AND (l.ends_on IS NULL OR l.ends_on>=$3::date)
          AND s.starts_at<(($3::date+interval '1 month')::date AT TIME ZONE 'Asia/Bangkok')
          AND (s.ends_at IS NULL OR s.ends_at>($3::date AT TIME ZONE 'Asia/Bangkok'))`,
        [leaseId,propertyId,period])
      if(!terms.rowCount)return {error:'lease_outside_period'}
      const property=await client.query<{billing_mode:string}>(`SELECT billing_mode FROM stayhub.properties WHERE id=$1`,[propertyId])
      if(property.rows[0]?.billing_mode==='nightly')return {error:'monthly_billing_disabled'}
      const duplicate=await client.query(`SELECT 1 FROM stayhub.billing_bills WHERE property_id=$1
        AND (lease_id=$2 OR (room_contract_id IS NOT NULL AND unit_id=$4)) AND period=$3::date AND bill_type='monthly'`,[propertyId,leaseId,period,identity.unitId])
      if(duplicate.rowCount)return {error:'duplicate_month'}
      const meters=await client.query<Meter>(`SELECT id,meter_type,usage,unit_rate,amount
        FROM stayhub.billing_meter_readings WHERE property_id=$1 AND unit_id=$2 AND period=$3::date
        ORDER BY meter_type FOR UPDATE`,[propertyId,identity.unitId,period])
      if(meters.rowCount&&!await exclusiveMonthlyStay(client,identity,period))return {error:'ambiguous_meter_occupancy'}
      const rent=parseMoney(terms.rows[0].monthly_rent)
      const extra=parseMoney(normalizedOther)
      const meterTotal=meters.rows.reduce((sum,m)=>sum+(parseMoney(m.amount)??NaN),0)
      const total=(rent??NaN)+(extra??NaN)+meterTotal
      if(!Number.isSafeInteger(total)||total>999999999999)return {error:'bill_amount_out_of_range'}
      const created=await client.query<{id:string}>(`INSERT INTO stayhub.billing_bills
        (property_id,account_id,unit_id,stay_id,lease_id,period,total,created_by,idempotency_key,request_hash)
        VALUES($1,$2,$3,$4,$5,$6::date,$7,$8,$9,$10) RETURNING id`,
        [propertyId,identity.accountId,identity.unitId,identity.stayId,leaseId,period,formatCents(total),account.id,key,hash])
      const billId=created.rows[0].id
      const insert=async(code:string,name:string,qty:string,rate:string,amount:string,readingId:string|null)=>{
        await client.query(`INSERT INTO stayhub.billing_bill_items
          (property_id,bill_id,unit_id,period,fee_code,label,quantity,unit_rate,amount,meter_reading_id)
          VALUES($1,$2,$3,$4::date,$5,$6,$7,$8,$9,$10)`,
          [propertyId,billId,identity.unitId,period,code,name,qty,rate,amount,readingId])
      }
      await insert('rent','ค่าเช่าห้อง','1',terms.rows[0].monthly_rent,terms.rows[0].monthly_rent,null)
      for(const m of meters.rows)await insert(m.meter_type,m.meter_type==='water'?'ค่าน้ำ':'ค่าไฟ',
        m.usage,m.unit_rate,m.amount,m.id)
      if(extra!==null&&extra>0)await insert('other',label,'1',normalizedOther,normalizedOther,null)
      await client.query(`UPDATE stayhub.billing_bills SET finalized=true WHERE id=$1 AND property_id=$2`,[billId,propertyId])
      return {id:billId,replayed:false,total:formatCents(total)}
    })
    if('error' in result)return reply({error:result.error},result.error==='forbidden'?403:409)
    return reply(result,result.replayed?200:201)
  }catch(e){
    const code=(e as {code?:string}).code
    if(code==='23505'||code==='23514'||code==='23503')return reply({error:'billing_identity_or_duplicate_conflict'},409)
    if(code==='22003')return reply({error:'bill_amount_out_of_range'},400)
    return reply({error:'Billing service unavailable'},503)
  }
}
