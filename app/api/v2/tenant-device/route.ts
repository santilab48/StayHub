import {randomUUID} from 'node:crypto'
import {cookies} from 'next/headers'
import {NextRequest,NextResponse} from 'next/server'
import {checkOrigin,hashToken,newToken,stagingAuthEnabled,TENANT_DEVICE_COOKIE} from '../../../../lib/cloud-identity'
import {postgresQuery,withPostgresTransaction} from '../../../../lib/db/postgres'

export const dynamic='force-dynamic'
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
const tokenPattern=/^[A-Za-z0-9_-]{43}$/

export async function GET(){
  if(!stagingAuthEnabled())return reply({error:'Unavailable'},503)
  const token=(await cookies()).get(TENANT_DEVICE_COOKIE)?.value
  if(!token||!tokenPattern.test(token))return reply({status:'not_started'})
  try{
    const r=await postgresQuery<{status:string;revoked_at:string|null;expires_at:string;active:boolean}>(`
      SELECT r.status,d.revoked_at,d.expires_at,
        EXISTS(SELECT 1 FROM stayhub.stays s WHERE s.join_request_id=r.id
          AND s.property_id=d.property_id AND s.unit_id=d.unit_id AND s.account_id=d.account_id
          AND s.starts_at<=now() AND (s.ends_at IS NULL OR s.ends_at>now())) AS active
      FROM stayhub.tenant_devices d
      JOIN stayhub.join_requests r ON r.property_id=d.property_id AND r.id=d.join_request_id
      WHERE d.token_hash=$1`,[hashToken(token)])
    if(!r.rowCount)return reply({status:'not_started'})
    const d=r.rows[0]
    if(d.revoked_at||new Date(d.expires_at)<=new Date()||d.status==='approved'&&!d.active)
      return reply({status:'revoked'})
    return reply({status:d.status==='approved'?'approved':d.status==='rejected'?'rejected':'pending'})
  }catch{return reply({error:'Unavailable'},503)}
}

export async function POST(req:NextRequest){
  if(!stagingAuthEnabled())return reply({error:'Unavailable'},503)
  if(!checkOrigin(req))return reply({error:'Invalid origin'},403)
  if(Number(req.headers.get('content-length')||0)>2048)return reply({error:'Invalid request'},413)
  let body:Record<string,unknown>
  try{body=await req.json();if(!body||Array.isArray(body)||typeof body!=='object')throw Error()}
  catch{return reply({error:'Invalid request'},400)}
  const invitation=body.token,roomNumber=typeof body.roomNumber==='string'?body.roomNumber.trim():''
  if(typeof invitation!=='string'||!tokenPattern.test(invitation)||!roomNumber||roomNumber.length>80)
    return reply({error:'Invalid invitation or room'},400)
  const current=(await cookies()).get(TENANT_DEVICE_COOKIE)?.value
  if(current&&tokenPattern.test(current)){
    const existing=await postgresQuery<{status:string}>(`
      SELECT r.status FROM stayhub.tenant_devices d
      JOIN stayhub.join_requests r ON r.id=d.join_request_id AND r.property_id=d.property_id
      JOIN stayhub.invites i ON i.id=r.invite_id AND i.property_id=r.property_id
      WHERE d.token_hash=$1 AND i.token_hash=$2 AND d.revoked_at IS NULL
        AND d.expires_at>now() AND r.status IN ('pending','approved')`,
      [hashToken(current),hashToken(invitation)])
    if(existing.rowCount)return reply({status:existing.rows[0].status})
  }
  const deviceToken=newToken()
  try{
    const result=await withPostgresTransaction(async client=>{
      const r=await client.query<{id:string;property_id:string;unit_id:string;unit_name:string}>(`
        SELECT i.id,i.property_id,i.unit_id,u.name AS unit_name FROM stayhub.invites i
        JOIN stayhub.properties p ON p.id=i.property_id AND p.status<>'suspended'
        JOIN stayhub.units u ON u.property_id=i.property_id AND u.id=i.unit_id AND u.active=true
        WHERE i.token_hash=$1 AND i.revoked_at IS NULL AND i.expires_at>now()
          AND i.use_count<i.max_uses FOR UPDATE OF i`,[hashToken(invitation)])
      if(!r.rowCount)return 'invalid'
      const invite=r.rows[0]
      if(invite.unit_name.trim()!==roomNumber)return 'wrong_room'
      const accountId=randomUUID()
      await client.query(`INSERT INTO stayhub.accounts(id,email)
        VALUES($1,$2)`,[accountId,`tenant-device-${accountId}@identity.invalid`])
      const joined=await client.query<{id:string}>(`
        INSERT INTO stayhub.join_requests(invite_id,property_id,account_id,unit_id)
        VALUES($1,$2,$3,$4) RETURNING id`,
        [invite.id,invite.property_id,accountId,invite.unit_id])
      await client.query(`INSERT INTO stayhub.tenant_devices
        (property_id,unit_id,account_id,join_request_id,token_hash,expires_at)
        VALUES($1,$2,$3,$4,$5,now()+interval '90 days')`,
        [invite.property_id,invite.unit_id,accountId,joined.rows[0].id,hashToken(deviceToken)])
      await client.query('UPDATE stayhub.invites SET use_count=use_count+1 WHERE id=$1',[invite.id])
      return 'pending'
    })
    if(result!=='pending')return reply({error:result},result==='wrong_room'?409:404)
    const jar=await cookies()
    jar.set(TENANT_DEVICE_COOKIE,deviceToken,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:90*86400})
    return reply({status:'pending'},201)
  }catch{return reply({error:'Unable to request room'},503)}
}
