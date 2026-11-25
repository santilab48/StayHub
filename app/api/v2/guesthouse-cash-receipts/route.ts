import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,checkOrigin,stagingAuthEnabled} from '../../../../lib/cloud-identity'
import {postgresQuery,withPostgresTransaction} from '../../../../lib/db/postgres'
import {endStay} from '../../../../lib/stay-lifecycle'
import {calculateCashBill} from '../../../../lib/cash-receipt'
export const dynamic='force-dynamic'
const reply=(x:unknown,status=200)=>NextResponse.json(x,{status,headers:{'Cache-Control':'no-store'}})
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
async function authorized(id:string,p:string){return (await postgresQuery(`SELECT 1 FROM stayhub.property_memberships m JOIN stayhub.properties p ON p.id=m.property_id WHERE m.account_id=$1 AND m.property_id=$2 AND m.role IN ('owner','admin') AND p.property_type IN ('guesthouse','daily','homestay')`,[id,p])).rowCount===1}
export async function GET(req:NextRequest){
 if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
 const a=await accountFromSession();if(!a)return reply({error:'Please sign in'},401)
 const p=req.nextUrl.searchParams.get('propertyId');if(!uuid(p)||!await authorized(a.id,p))return reply({error:'Forbidden'},403)
 const r=await postgresQuery(`SELECT id,reservation_id,'CS-'||lpad(receipt_number::text,8,'0') AS number,issued_at,snapshot FROM stayhub.guesthouse_cash_receipts WHERE property_id=$1 ORDER BY issued_at DESC LIMIT 500`,[p])
 return reply({items:r.rows.map(x=>({...x.snapshot,id:x.id,reservation_id:x.reservation_id,number:x.number,issued_at:x.issued_at}))})
}
export async function POST(req:NextRequest){
 if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
 if(!checkOrigin(req))return reply({error:'Invalid origin'},403)
 const a=await accountFromSession();if(!a)return reply({error:'Please sign in'},401)
 let d;try{const raw=await req.text();if(raw.length>24000)return reply({error:'Too large'},413);d=JSON.parse(raw)}catch{return reply({error:'Invalid JSON'},400)}
 if(!d||!uuid(d.propertyId)||!uuid(d.reservationId)||!await authorized(a.id,d.propertyId))return reply({error:'Forbidden'},403)
 if(!['cash','transfer','card'].includes(d.method)||d.confirmPaid!==true)return reply({error:'Confirm actual payment first'},400)
 try{
 const result=await withPostgresTransaction(async client=>{
 const seed=await client.query('SELECT unit_id FROM stayhub.reservations WHERE id=$1 AND property_id=$2',[d.reservationId,d.propertyId])
 if(!seed.rowCount)return null
 await client.query('SELECT id FROM stayhub.units WHERE id=$1 AND property_id=$2 FOR UPDATE',[seed.rows[0].unit_id,d.propertyId])
 const r=await client.query(`SELECT r.id,r.unit_id,r.status,r.total_amount,r.booking_details,r.arrival_date::text AS arrival,r.departure_date::text AS departure,u.name AS room_name,p.name AS property_name FROM stayhub.reservations r JOIN stayhub.units u ON u.id=r.unit_id AND u.property_id=r.property_id JOIN stayhub.properties p ON p.id=r.property_id WHERE r.id=$1 AND r.property_id=$2 AND p.property_type IN ('guesthouse','daily','homestay') FOR UPDATE OF r`,[d.reservationId,d.propertyId])
 const b=r.rows[0];if(!b||b.unit_id!==seed.rows[0].unit_id||!['checked_in','checked_out'].includes(b.status)||b.total_amount===null)return null
 const bill=calculateCashBill(Number(b.total_amount),d.extras,d.deposit,d.discount);if(!bill)return null
 const snapshot={...bill,property_name:b.property_name,room_name:b.room_name,guest_name:b.booking_details?.guestName||'',arrival:b.arrival,departure:b.departure,method:d.method}
 const insert=await client.query(`INSERT INTO stayhub.guesthouse_cash_receipts(property_id,reservation_id,issued_by,snapshot) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(property_id,reservation_id) DO NOTHING RETURNING id,reservation_id,'CS-'||lpad(receipt_number::text,8,'0') AS number,issued_at,snapshot`,[d.propertyId,d.reservationId,a.id,JSON.stringify(snapshot)])
 const x=insert.rows[0];if(!x)return {duplicate:true}
 if(b.status==='checked_in'){
  const stays=await client.query('SELECT id FROM stayhub.stays WHERE property_id=$1 AND reservation_id=$2 AND starts_at<=now() AND (ends_at IS NULL OR ends_at>now()) FOR UPDATE',[d.propertyId,d.reservationId])
  if(!stays.rowCount)throw Error('active stay missing')
  for(const stay of stays.rows){
   const lease=await client.query("SELECT 1 FROM stayhub.leases WHERE property_id=$1 AND stay_id=$2 AND status='active' LIMIT 1",[d.propertyId,stay.id])
   if(lease.rowCount)throw Error('active lease')
   if(!await endStay(client,d.propertyId,stay.id,a.id))throw Error('checkout failed')
  }
  await client.query("UPDATE stayhub.reservations SET status='checked_out' WHERE property_id=$1 AND id=$2",[d.propertyId,d.reservationId])
 }
 return {...x.snapshot,id:x.id,reservation_id:x.reservation_id,number:x.number,issued_at:x.issued_at}
 })
 if(!result)return reply({error:'Invalid booking or bill'},400)
 if('duplicate' in result)return reply({error:'ออกบิลรายการนี้แล้ว กรุณาเปิดประวัติ'},409)
 return reply(result,201)
 }catch{return reply({error:'ไม่สามารถออกบิลได้'},503)}
}
