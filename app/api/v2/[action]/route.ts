import {NextRequest,NextResponse} from 'next/server'
import {postgresQuery,withPostgresTransaction} from '../../../../lib/db/postgres'
import {accountFromSession,checkOrigin,hashPassword,hashToken,issueSession,newToken,stagingAuthEnabled,verifyPassword} from '../../../../lib/cloud-identity'
import QRCode from 'qrcode'

export const dynamic='force-dynamic'
type Params={params:Promise<{action:string}>}
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
function validEmail(s:unknown){return typeof s==='string'&&s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)}
function validId(s:unknown){return typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)}
const roles=['owner','admin'] as const
function enabled(){return stagingAuthEnabled()}
async function ownerHasProperty(accountId:string,propertyId:string){
  const r=await postgresQuery(`SELECT 1 FROM stayhub.property_memberships WHERE account_id=$1 AND property_id=$2 AND role=ANY($3::text[])`,[accountId,propertyId,roles])
  return r.rowCount===1
}
export async function GET(req:NextRequest,{params}:Params){
  if(!enabled())return reply({error:'Cloud onboarding not enabled'},503)
  const {action}=await params
  try {
    if(action==='invite'){
      const token=req.nextUrl.searchParams.get('token')
      if(!token||token.length>128)return reply({error:'Invalid invitation'},400)
      const r=await postgresQuery<{name:string;property_type:string;unit_name:string|null}>(`
        SELECT p.name,p.property_type,u.name AS unit_name FROM stayhub.invites i
        JOIN stayhub.properties p ON p.id=i.property_id
        LEFT JOIN stayhub.units u ON u.id=i.unit_id AND u.property_id=i.property_id
        WHERE i.token_hash=$1 AND i.revoked_at IS NULL AND i.expires_at>now()
        AND i.use_count<i.max_uses AND p.status<>'suspended'`,[hashToken(token)])
      return r.rowCount?reply(r.rows[0]):reply({error:'Invitation expired or invalid'},404)
    }
    const account=await accountFromSession()
    if(!account)return reply({error:'Please sign in'},401)
    if(action==='me')return reply({id:account.id,email:account.email})
    if(action==='properties'){
      const r=await postgresQuery(`SELECT p.id,p.name,p.property_type,p.billing_mode,m.role
        FROM stayhub.properties p JOIN stayhub.property_memberships m ON m.property_id=p.id
        WHERE m.account_id=$1 ORDER BY p.created_at DESC`,[account.id])
      return reply({items:r.rows})
    }
    if(action==='units'){
      const propertyId=req.nextUrl.searchParams.get('propertyId')
      if(!validId(propertyId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const r=await postgresQuery('SELECT id,name FROM stayhub.units WHERE property_id=$1 AND active=true ORDER BY name LIMIT 500',[propertyId])
      return reply({items:r.rows})
    }
    if(action==='requests'){
      const propertyId=req.nextUrl.searchParams.get('propertyId')
      if(!validId(propertyId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const r=await postgresQuery(`SELECT r.id,r.status,r.created_at,a.email,u.name AS unit_name
        FROM stayhub.join_requests r JOIN stayhub.accounts a ON a.id=r.account_id
        LEFT JOIN stayhub.units u ON u.id=r.unit_id AND u.property_id=r.property_id
        WHERE r.property_id=$1 ORDER BY r.created_at DESC LIMIT 100`,[propertyId])
      return reply({items:r.rows})
    }
    return reply({error:'Not found'},404)
  }catch {return reply({error:'Request unavailable'},503)}
}
export async function POST(req:NextRequest,{params}:Params){
  if(!enabled())return reply({error:'Cloud onboarding not enabled'},503)
  if(!checkOrigin(req))return reply({error:'Invalid request origin'},403)
  if(Number(req.headers.get('content-length')||0)>8192)return reply({error:'Payload too large'},413)
  const {action}=await params
  let body:Record<string,unknown>
  try{body=await req.json();if(!body||Array.isArray(body)||typeof body!=='object')throw Error('bad')}
  catch{return reply({error:'Invalid JSON'},400)}
  try {
    if(action==='register'){
      const email=typeof body.email==='string'?body.email.trim().toLowerCase():''
      const password=body.password
      if(!validEmail(email)||typeof password!=='string'||password.length<12||password.length>128)return reply({error:'Provide valid email and a password of 12–128 characters'},400)
      const stored=await hashPassword(password)
      try{
        const r=await postgresQuery<{id:string}>('INSERT INTO stayhub.accounts(email,password_hash) VALUES($1,$2) RETURNING id',[email,stored])
        await issueSession(r.rows[0].id)
        return reply({ok:true},201)
      }catch{return reply({error:'Registration unavailable or email already registered'},409)}
    }
    if(action==='login'){
      const email=typeof body.email==='string'?body.email.trim().toLowerCase():''
      if(!validEmail(email)||typeof body.password!=='string')return reply({error:'Invalid credentials'},401)
      const r=await postgresQuery<{id:string;password_hash:string|null}>('SELECT id,password_hash FROM stayhub.accounts WHERE lower(email)=$1',[email])
      if(!r.rowCount||!r.rows[0].password_hash||!await verifyPassword(body.password,r.rows[0].password_hash))return reply({error:'Invalid credentials'},401)
      await issueSession(r.rows[0].id)
      return reply({ok:true})
    }
    const account=await accountFromSession()
    if(!account)return reply({error:'Please sign in'},401)
    if(action==='property'){
      const name=typeof body.name==='string'?body.name.trim():''
      const type=body.type
      if(!name||name.length>120||!['apartment','guesthouse','daily','homestay'].includes(String(type)))return reply({error:'Invalid property'},400)
      const id=await withPostgresTransaction(async c=>{
        const r=await c.query<{id:string}>(`INSERT INTO stayhub.properties(owner_account_id,name,property_type) VALUES($1,$2,$3) RETURNING id`,[account.id,name,type])
        await c.query(`INSERT INTO stayhub.property_memberships(property_id,account_id,role) VALUES($1,$2,'owner')`,[r.rows[0].id,account.id])
        return r.rows[0].id
      })
      return reply({id},201)
    }
    const propertyId=body.propertyId
    if(action==='unit'){
      if(!validId(propertyId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const name=typeof body.name==='string'?body.name.trim():''
      if(!name||name.length>80)return reply({error:'Invalid unit name'},400)
      const r=await postgresQuery<{id:string}>('INSERT INTO stayhub.units(property_id,name) VALUES($1,$2) RETURNING id',[propertyId,name])
      return reply({id:r.rows[0].id},201)
    }
    if(action==='create-invite'){
      if(!validId(propertyId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const unitId=body.unitId
      if(unitId!==undefined&&unitId!==null){
        if(!validId(unitId))return reply({error:'Invalid unit'},400)
        const u=await postgresQuery('SELECT 1 FROM stayhub.units WHERE id=$1 AND property_id=$2 AND active=true',[unitId,propertyId])
        if(!u.rowCount)return reply({error:'Unit outside property'},403)
      }
      const raw=newToken()
      await postgresQuery(`INSERT INTO stayhub.invites(property_id,created_by,token_hash,unit_id,expires_at,max_uses)
        VALUES($1,$2,$3,$4,now()+interval '7 days',100)`,[propertyId,account.id,hashToken(raw),unitId||null])
      const url=new URL('/join',req.nextUrl.origin)
      url.searchParams.set('token',raw)
      return reply({url:url.toString(),svg:await QRCode.toString(url.toString(),{type:'svg',margin:2,width:260})},201)
    }
    if(action==='join'){
      const token=body.token
      if(typeof token!=='string'||token.length>128)return reply({error:'Invalid invitation'},400)
      const result=await withPostgresTransaction(async client=>{
        const r=await client.query<{id:string;property_id:string;unit_id:string|null;created_by:string}>(`
          SELECT i.id,i.property_id,i.unit_id,i.created_by FROM stayhub.invites i
          JOIN stayhub.properties p ON p.id=i.property_id
          WHERE i.token_hash=$1 AND i.revoked_at IS NULL AND i.expires_at>now()
          AND i.use_count<i.max_uses AND p.status<>'suspended'
          FOR UPDATE OF i`,[hashToken(token)])
        if(!r.rowCount)return 'invalid'
        const item=r.rows[0]
        const owner=await client.query('SELECT 1 FROM stayhub.property_memberships WHERE account_id=$1 AND property_id=$2 AND role=ANY($3::text[])',[account.id,item.property_id,roles])
        if(owner.rowCount)return 'owner'
        const existing=await client.query('SELECT id FROM stayhub.join_requests WHERE property_id=$1 AND account_id=$2',[item.property_id,account.id])
        if(existing.rowCount)return 'existing'
        await client.query('INSERT INTO stayhub.join_requests(invite_id,property_id,account_id,unit_id) VALUES($1,$2,$3,$4)',[item.id,item.property_id,account.id,item.unit_id])
        await client.query('UPDATE stayhub.invites SET use_count=use_count+1 WHERE id=$1',[item.id])
        return 'pending'
      })
      return result==='pending'?reply({status:'pending'},201):reply({error:result},400)
    }
    if(action==='approve'){
      if(!validId(propertyId)||!validId(body.requestId)||!validId(body.unitId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const result=await withPostgresTransaction(async client=>{
        const r=await client.query<{account_id:string;status:string}>(`SELECT account_id,status FROM stayhub.join_requests
          WHERE id=$1 AND property_id=$2 FOR UPDATE`,[body.requestId,propertyId])
        if(!r.rowCount||r.rows[0].status!=='pending')return 'not_pending'
        const unit=await client.query('SELECT id FROM stayhub.units WHERE id=$1 AND property_id=$2 AND active=true',[body.unitId,propertyId])
        if(!unit.rowCount)return 'invalid_unit'
        const membership=await client.query('SELECT role FROM stayhub.property_memberships WHERE property_id=$1 AND account_id=$2',[propertyId,r.rows[0].account_id])
        if(membership.rows.some(row=>!['resident','guest'].includes(row.role)))return 'reserved_role'
        await client.query(`INSERT INTO stayhub.stays(property_id,unit_id,account_id,join_request_id)
          VALUES($1,$2,$3,$4)`,[propertyId,body.unitId,r.rows[0].account_id,body.requestId])
        await client.query(`INSERT INTO stayhub.property_memberships(property_id,account_id,role)
          VALUES($1,$2,'resident') ON CONFLICT(property_id,account_id) DO UPDATE SET role='resident'
          WHERE stayhub.property_memberships.role IN ('resident','guest')`,[propertyId,r.rows[0].account_id])
        await client.query(`UPDATE stayhub.join_requests SET status='approved',reviewed_by=$1,reviewed_at=now(),unit_id=$2 WHERE id=$3`,[account.id,body.unitId,body.requestId])
        return 'approved'
      })
      return result==='approved'?reply({status:'approved'}):reply({error:result},409)
    }
    return reply({error:'Not found'},404)
  }catch{return reply({error:'Operation unavailable'},503)}
}
