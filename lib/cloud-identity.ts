import 'server-only'
import {createHash,randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto'
import {promisify} from 'node:util'
import {cookies} from 'next/headers'
import {NextRequest} from 'next/server'
import {postgresQuery} from './db/postgres'

const scrypt=promisify(scryptCallback)
const COOKIE='stayhub_session'
export const TENANT_DEVICE_COOKIE='stayhub_tenant_device'
export const hashToken=(raw:string)=>createHash('sha256').update(raw).digest('hex')
export const newToken=()=>randomBytes(32).toString('base64url')
export async function hashPassword(password:string){
  const salt=randomBytes(16).toString('hex')
  const key=await scrypt(password,salt,64) as Buffer
  return 'scrypt:'+salt+':'+key.toString('hex')
}
export async function verifyPassword(password:string,stored:string){
  const [algorithm,salt,hex]=stored.split(':')
  if(algorithm!=='scrypt'||!salt||!/^[0-9a-f]{128}$/.test(hex||''))return false
  const actual=await scrypt(password,salt,64) as Buffer
  return timingSafeEqual(actual,Buffer.from(hex,'hex'))
}
export async function issueSession(accountId:string){
  const raw=newToken()
  await postgresQuery('INSERT INTO stayhub.sessions(account_id,token_hash,expires_at) VALUES($1,$2,now()+interval \'14 days\')',[accountId,hashToken(raw)])
  const jar=await cookies()
  jar.set(COOKIE,raw,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:14*86400})
}
export async function accountFromSession(tenantOnly=false){
  const raw=(await cookies()).get(COOKIE)?.value
  if(raw&&!tenantOnly){
    const res=await postgresQuery<{id:string,email:string}>(
      `SELECT a.id,a.email FROM stayhub.sessions s
       JOIN stayhub.accounts a ON a.id=s.account_id
       WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()`,
       [hashToken(raw)])
    if(res.rows[0])return res.rows[0]
  }
  const device=(await cookies()).get(TENANT_DEVICE_COOKIE)?.value
  if(!device)return null
  const res=await postgresQuery<{id:string,email:string}>(`
    SELECT a.id,a.email FROM stayhub.tenant_devices d
    JOIN stayhub.join_requests r ON r.property_id=d.property_id AND r.id=d.join_request_id
      AND r.account_id=d.account_id AND r.unit_id=d.unit_id AND r.status='approved'
    JOIN stayhub.stays s ON s.join_request_id=r.id AND s.property_id=d.property_id
      AND s.account_id=d.account_id AND s.unit_id=d.unit_id
      AND s.starts_at<=now() AND (s.ends_at IS NULL OR s.ends_at>now())
    JOIN stayhub.accounts a ON a.id=d.account_id
    WHERE d.token_hash=$1 AND d.revoked_at IS NULL AND d.expires_at>now()`,
    [hashToken(device)])
  return res.rows[0]||null
}
export function checkOrigin(req:NextRequest){
  const origin=req.headers.get('origin')
  if(!origin)return false
  try{
    const u=new URL(origin)
    const host=req.headers.get('x-forwarded-host')||req.headers.get('host')||req.nextUrl.host
    return u.host===host && ['http:','https:'].includes(u.protocol)
  }catch{return false}
}
/** Cloud APIs are enabled only for the explicitly approved StayHub environments. */
export function stagingAuthEnabled(){
  const env=process.env
  const staging=env.RAILWAY_ENVIRONMENT_NAME==='staging' &&
    env.RAILWAY_ENVIRONMENT_ID==='ced39691-4fe7-4707-bba7-6d0e801f1ff8' &&
    env.STAYHUB_ENABLE_TEST_SIGNUP==='1'
  const production=env.RAILWAY_ENVIRONMENT_NAME==='production' &&
    env.RAILWAY_ENVIRONMENT_ID==='c9c4b13a-9041-4ae6-bd50-2d02b546b053' &&
    env.RAILWAY_PROJECT_ID==='a8a5a434-4d18-438f-b4ea-ece072094595' &&
    env.STAYHUB_ENABLE_PRODUCTION_AUTH==='1'
  return staging || production
}
