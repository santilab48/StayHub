import 'server-only'
import {createHash,randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto'
import {promisify} from 'node:util'
import {cookies} from 'next/headers'
import {NextRequest} from 'next/server'
import {postgresQuery} from './db/postgres'

const scrypt=promisify(scryptCallback)
const COOKIE='stayhub_session'
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
export async function accountFromSession(){
  const raw=(await cookies()).get(COOKIE)?.value
  if(!raw)return null
  const res=await postgresQuery<{id:string,email:string}>(
    `SELECT a.id,a.email FROM stayhub.sessions s
     JOIN stayhub.accounts a ON a.id=s.account_id
     WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()`,
     [hashToken(raw)])
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
export function stagingAuthEnabled(){
  return process.env.RAILWAY_ENVIRONMENT_NAME==='staging' &&
    process.env.RAILWAY_ENVIRONMENT_ID==='ced39691-4fe7-4707-bba7-6d0e801f1ff8' &&
    process.env.STAYHUB_ENABLE_TEST_SIGNUP==='1'
}
