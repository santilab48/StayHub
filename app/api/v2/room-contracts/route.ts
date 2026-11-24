import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,checkOrigin,stagingAuthEnabled} from '../../../../lib/cloud-identity'
import {postgresQuery,withPostgresTransaction} from '../../../../lib/db/postgres'
export const dynamic='force-dynamic'
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}})
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const keys=['signedAt','landlord','landlordAddress','landlordPhone','tenant','tenantAddress','tenantPhone','propertyAddress','startsOn','endsOn','rent','deposit','advance','water','electric','service','dueDay','inventory','terms'] as const
const required=['signedAt','landlord','landlordAddress','tenant','tenantAddress','propertyAddress','startsOn','endsOn','rent','deposit','advance','water','electric','service','dueDay']
function validDate(v:string){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v}
async function access(accountId:string,unitId:string){
 return (await postgresQuery<{property_id:string;property_name:string;unit_name:string;active:boolean}>(`SELECT u.property_id,p.name AS property_name,u.name AS unit_name,u.active FROM stayhub.units u JOIN stayhub.properties p ON p.id=u.property_id JOIN stayhub.property_memberships m ON m.property_id=p.id WHERE u.id=$1 AND m.account_id=$2 AND m.role IN ('owner','admin')`,[unitId,accountId])).rows[0]
}
export async function GET(req:NextRequest){
 if(!stagingAuthEnabled())return reply({error:'ระบบไม่พร้อมใช้งาน'},503)
 try{
 const account=await accountFromSession();if(!account)return reply({error:'กรุณาเข้าสู่ระบบ'},401)
 const unitId=req.nextUrl.searchParams.get('unitId');if(!uuid(unitId))return reply({error:'กรุณาเลือกห้อง'},400)
 const room=await access(account.id,unitId);if(!room)return reply({error:'ไม่มีสิทธิ์เข้าถึงห้อง'},403)
 const rows=await postgresQuery('SELECT id,snapshot,created_at FROM stayhub.room_contracts WHERE property_id=$1 AND unit_id=$2 ORDER BY created_at DESC LIMIT 100',[room.property_id,unitId])
 return reply({room,items:rows.rows})
 }catch{return reply({error:'ไม่สามารถโหลดเอกสารสัญญาได้'},503)}
}
export async function POST(req:NextRequest){
 if(!stagingAuthEnabled())return reply({error:'ระบบไม่พร้อมใช้งาน'},503)
 if(!checkOrigin(req))return reply({error:'Invalid origin'},403)
 try{
 const account=await accountFromSession();if(!account)return reply({error:'กรุณาเข้าสู่ระบบ'},401)
 const raw=await req.text();if(raw.length>30000)return reply({error:'ข้อมูลยาวเกินกำหนด'},413)
 let body:Record<string,unknown>;try{body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')throw Error()}catch{return reply({error:'ข้อมูลไม่ถูกต้อง'},400)}
 const unitId=body.unitId;if(!uuid(unitId))return reply({error:'กรุณาเลือกห้อง'},400)
 const room=await access(account.id,unitId);if(!room||!room.active)return reply({error:'ไม่มีสิทธิ์หรือห้องปิดใช้งาน'},403)
 const fields:Record<string,string>={}
 for(const key of keys){const value=body[key];if(typeof value!=='string'||value.length>4000)return reply({error:'ข้อมูลไม่ถูกต้อง: '+key},400);fields[key]=value.trim()}
 if(required.some(k=>!fields[k]))return reply({error:'กรุณากรอกข้อมูลให้ครบ'},400)
 if(!['signedAt','startsOn','endsOn'].every(k=>validDate(fields[k]))||fields.endsOn<=fields.startsOn)return reply({error:'วันที่สัญญาไม่ถูกต้อง'},400)
 for(const key of ['rent','deposit','advance','water','electric','service']){if(!/^\d+(\.\d{1,2})?$/.test(fields[key])||Number(fields[key])>100000000)return reply({error:'จำนวนเงินไม่ถูกต้อง'},400)}
 if(!/^\d{1,2}$/.test(fields.dueDay)||Number(fields.dueDay)<1||Number(fields.dueDay)>28)return reply({error:'วันชำระต้องอยู่ระหว่าง 1–28'},400)
 const snapshot={...fields,propertyName:room.property_name,unitName:room.unit_name,templateVersion:'room-rental-draft-v1'}
 const saved=await withPostgresTransaction(async c=>{
 const allowed=await c.query(`SELECT u.id FROM stayhub.units u JOIN stayhub.property_memberships m ON m.property_id=u.property_id WHERE u.id=$1 AND u.property_id=$2 AND u.active AND m.account_id=$3 AND m.role IN ('owner','admin') FOR UPDATE OF u`,[unitId,room.property_id,account.id])
 if(!allowed.rowCount)return null
 const r=await c.query('INSERT INTO stayhub.room_contracts(property_id,unit_id,created_by,snapshot) VALUES($1,$2,$3,$4::jsonb) RETURNING id,snapshot,created_at',[room.property_id,unitId,account.id,JSON.stringify(snapshot)])
 return r.rows[0]
 })
 return saved?reply(saved,201):reply({error:'ไม่มีสิทธิ์เข้าถึงห้อง'},403)
 }catch{return reply({error:'บันทึกสัญญาไม่สำเร็จ'},503)}
}
