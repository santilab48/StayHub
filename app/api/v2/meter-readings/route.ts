import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,checkOrigin,stagingAuthEnabled} from '../../../../lib/cloud-identity'
import {withPostgresTransaction} from '../../../../lib/db/postgres'
import {canManageProperty,periodDate,uuid} from '../../../../lib/db/billing-request'
import {cents,meterCharge,thousandths} from '../../../../lib/db/billing-calculation'

export const dynamic='force-dynamic'
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}})
type Reading={id:string;previous_reading:string;current_reading:string;usage:string;unit_rate:string;amount:string}

export async function GET(req:NextRequest){
  if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
  const account=await accountFromSession()
  if(!account)return reply({error:'Please sign in'},401)
  const propertyId=req.nextUrl.searchParams.get('propertyId'),unitId=req.nextUrl.searchParams.get('unitId'),period=periodDate(req.nextUrl.searchParams.get('period'))
  if(!uuid(propertyId)||!uuid(unitId)||!period)return reply({error:'Invalid meter input'},400)
  try{return await withPostgresTransaction(async client=>{
    if(!await canManageProperty(client,account.id,propertyId))return reply({error:'Forbidden'},403)
    const unit=await client.query('SELECT id FROM stayhub.units WHERE property_id=$1 AND id=$2',[propertyId,unitId])
    if(!unit.rowCount)return reply({error:'unit_not_found'},404)
    const current=await client.query('SELECT meter_type,previous_reading,current_reading,unit_rate,usage,amount FROM stayhub.billing_meter_readings WHERE property_id=$1 AND unit_id=$2 AND period=$3::date',[propertyId,unitId,period])
    const previous=await client.query('SELECT DISTINCT ON (meter_type) meter_type,current_reading FROM stayhub.billing_meter_readings WHERE property_id=$1 AND unit_id=$2 AND period<$3::date ORDER BY meter_type,period DESC',[propertyId,unitId,period])
    return reply({items:current.rows,previous:previous.rows})
  })}catch{return reply({error:'Meter service unavailable'},503)}
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
  const {propertyId,unitId,meterType,currentReading,unitRate,initialReading}=body
  const period=periodDate(body.period)
  if(!uuid(propertyId)||!uuid(unitId)||!period||
     (meterType!=='water'&&meterType!=='electric')||
     thousandths(currentReading)===null||cents(unitRate)===null||
     (initialReading!==undefined&&thousandths(initialReading)===null))return reply({error:'Invalid meter input'},400)
  try{
    const result=await withPostgresTransaction(async client=>{
      if(!await canManageProperty(client,account.id,propertyId))return {error:'forbidden'}
      // Serialize readings on the unit, including concurrent first readings.
      const unit=await client.query(`SELECT id FROM stayhub.units WHERE property_id=$1 AND id=$2 FOR UPDATE`,[propertyId,unitId])
      if(!unit.rowCount)return {error:'unit_not_found'}
      const issued=await client.query(`SELECT 1 FROM stayhub.billing_bills WHERE property_id=$1 AND unit_id=$2 AND period=$3::date AND finalized=true`,[propertyId,unitId,period])
      if(issued.rowCount)return {error:'bill_already_issued'}
      const contracts=await client.query(`SELECT snapshot FROM stayhub.room_contracts WHERE property_id=$1 AND unit_id=$2 AND (snapshot->>'startsOn')::date<($3::date+interval '1 month')::date AND (snapshot->>'endsOn')::date>=$3::date LIMIT 2`,[propertyId,unitId,period])
      if(contracts.rows.length>1)return {error:'overlapping_contracts'}
      if(contracts.rows.length===1&&cents(contracts.rows[0].snapshot[meterType])!==cents(unitRate))return {error:'meter_rate_mismatch'}
      const duplicate=await client.query(`SELECT 1 FROM stayhub.billing_meter_readings
        WHERE property_id=$1 AND unit_id=$2 AND meter_type=$3 AND period=$4::date`,[propertyId,unitId,meterType,period])
      if(duplicate.rowCount)return {error:'duplicate_reading'}
      const last=await client.query<{current_reading:string}>(`SELECT current_reading
        FROM stayhub.billing_meter_readings WHERE property_id=$1 AND unit_id=$2 AND meter_type=$3
          AND period<$4::date ORDER BY period DESC LIMIT 1`,[propertyId,unitId,meterType,period])
      const previous=last.rows[0]?.current_reading??initialReading
      if(typeof previous!=='string')return {error:'initial_reading_required'}
      if(last.rowCount&&initialReading!==undefined)return {error:'initial_reading_only_for_first_month'}
      const later=await client.query(`SELECT 1 FROM stayhub.billing_meter_readings
        WHERE property_id=$1 AND unit_id=$2 AND meter_type=$3 AND period>$4::date LIMIT 1`,
        [propertyId,unitId,meterType,period])
      if(later.rowCount)return {error:'later_reading_exists'}
      const charge=meterCharge(previous,currentReading as string,unitRate as string)
      if(!charge)return {error:'reading_decreased_or_overflow'}
      const created=await client.query<Reading>(`INSERT INTO stayhub.billing_meter_readings
        (property_id,unit_id,meter_type,period,previous_reading,current_reading,unit_rate,recorded_by)
        VALUES($1,$2,$3,$4::date,$5,$6,$7,$8)
        RETURNING id,previous_reading,current_reading,usage,unit_rate,amount`,
        [propertyId,unitId,meterType,period,previous,currentReading,unitRate,account.id])
      return {reading:created.rows[0]}
    })
    return 'reading' in result?reply(result,201):reply({error:result.error},result.error==='forbidden'?403:409)
  }catch(e){
    if((e as {code?:string}).code==='23505')return reply({error:'duplicate_reading'},409)
    if((e as {code?:string}).code==='22003')return reply({error:'meter_amount_out_of_range'},400)
    return reply({error:'Meter service unavailable'},503)
  }
}
