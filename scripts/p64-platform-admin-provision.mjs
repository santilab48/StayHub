#!/usr/bin/env node
/**
 * P6.4 offline dual-signature platform-admin operator workflow.
 * Never expose as an HTTP API and never place signer private keys on Railway.
 * Usage: node scripts/p64-platform-admin-provision.mjs /path/to/signed-request.json
 * Approval request envelope: {request:{action,account,reason,requestId,expiresAt},signatures:{a,b}}
 * Sign exactly JSON.stringify(request), using Ed25519 signatures and distinct provisioned public keys.
 */
import {readFileSync} from 'node:fs'
import {createHash,createPublicKey,verify as cryptoVerify} from 'node:crypto'
import pg from 'pg'
const env=process.env
const exactCI=env.CI==='true'&&
 env.DATABASE_URL==='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_p26_ci' &&
 env.STAYHUB_MEMBERSHIP_ADMIN_DATABASE_URL==='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_membership_ci'
const intendedStaging=!exactCI &&
 env.STAYHUB_P64_STAGING_APPROVED==='YES' &&
 env.RAILWAY_PROJECT_ID==='a8a5a434-4d18-438f-b4ea-ece072094595' &&
 env.RAILWAY_ENVIRONMENT_NAME==='staging' &&
 env.RAILWAY_ENVIRONMENT_ID==='ced39691-4fe7-4707-bba7-6d0e801f1ff8'
if(!exactCI&&!intendedStaging)throw Error('REFUSED: P6.4 grants/revocations disabled outside isolated CI and explicitly approved staging')
const raw=env.STAYHUB_MEMBERSHIP_ADMIN_DATABASE_URL
const rail=env.STAYHUB_P64_RAILWAY_READONLY_URL
if(!raw||!rail)throw Error('REFUSED: both privileged Neon and read-only Railway DB credentials required')
const neon=new URL(raw)
const railway=new URL(rail)
if(!['postgres:','postgresql:'].includes(neon.protocol)||
 !['postgres:','postgresql:'].includes(railway.protocol))throw Error('REFUSED: invalid database scheme')
if(exactCI){
 if(neon.hostname!=='127.0.0.1'||neon.pathname!=='/stayhub_membership_ci'||
  railway.hostname!=='127.0.0.1'||railway.pathname!=='/stayhub_p26_ci')
   throw Error('REFUSED: CI database targets incorrect')
}else{
 if(!env.STAYHUB_MEMBERSHIP_NEON_HOST ||
  !env.STAYHUB_MEMBERSHIP_NEON_HOST.endsWith('.neon.tech') ||
  neon.hostname!==env.STAYHUB_MEMBERSHIP_NEON_HOST||neon.pathname!=='/neondb' ||
  !env.STAYHUB_P64_RAILWAY_READONLY_HOST ||
  !env.STAYHUB_P64_RAILWAY_READONLY_HOST.endsWith('.railway.internal') ||
  railway.hostname!==env.STAYHUB_P64_RAILWAY_READONLY_HOST ||
  railway.pathname!=='/railway' ||
  decodeURIComponent(railway.username)!=='stayhub_identity_reader')
  throw Error('REFUSED: Neon staging target mismatch or Railway read-only identity mismatch')
 neon.searchParams.set('sslmode','verify-full')
 // Requires a separately provisioned SELECT-only Railway role; never reuse admin credentials.
 if(decodeURIComponent(neon.username)==='stayhub_membership_reader')
  throw Error('REFUSED: Neon read-only role cannot mutate administrators')
}
if(process.argv.length!==3)throw Error('A signed approval request file path is required')
const artifact=JSON.parse(readFileSync(process.argv[2],'utf8'))
const req=artifact?.request
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if(!req || Object.keys(req).sort().join(',')!=='account,action,expiresAt,reason,requestId'||
 !['grant','revoke'].includes(req.action)||
 typeof req.account!=='string'||!uuid.test(req.account)||
 typeof req.requestId!=='string'||!uuid.test(req.requestId)||
 typeof req.reason!=='string'||req.reason.trim().length<5||req.reason.length>500||
 typeof req.expiresAt!=='string' || !Number.isFinite(Date.parse(req.expiresAt))||
 Date.parse(req.expiresAt)<=Date.now()||Date.parse(req.expiresAt)>Date.now()+15*60*1000)
 throw Error('REFUSED: invalid or stale signed request')
const aKey=env.STAYHUB_P64_APPROVER_A_SPKI_B64,bKey=env.STAYHUB_P64_APPROVER_B_SPKI_B64
if(!aKey||!bKey||aKey===bKey)throw Error('REFUSED: two distinct configured Ed25519 approvers required')
// The key registry must bind each key to an independently identified Railway account.
// A valid signature alone does not prove that its holder is a different person from the target.
const aAccount=env.STAYHUB_P64_APPROVER_A_ACCOUNT_ID
const bAccount=env.STAYHUB_P64_APPROVER_B_ACCOUNT_ID
if(!uuid.test(aAccount??'')||!uuid.test(bAccount??'')||
 aAccount.toLowerCase()===bAccount.toLowerCase()||
 req.account.toLowerCase()===aAccount.toLowerCase()||
 req.account.toLowerCase()===bAccount.toLowerCase())
 throw Error('REFUSED: distinct verified approver accounts required; self-grant and self-revoke forbidden')
const msg=Buffer.from(JSON.stringify(req),'utf8')
function authenticate(base64,signature){
 if(typeof signature!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(signature))return false
 try{
  const publicKey=createPublicKey({key:Buffer.from(base64,'base64'),format:'der',type:'spki'})
  if(publicKey.asymmetricKeyType!=='ed25519')return false
  const decoded=Buffer.from(signature,'base64')
  return decoded.length===64 && cryptoVerify(null,msg,publicKey,decoded)
 }catch{return false}
}
if(!authenticate(aKey,artifact.signatures?.a)||!authenticate(bKey,artifact.signatures?.b))
 throw Error('REFUSED: missing or invalid dual signatures')
const fingerprint=k=>createHash('sha256').update(Buffer.from(k,'base64')).digest('hex')
const railwayDb=new pg.Client({connectionString:rail})
const neonDb=new pg.Client({connectionString:neon.toString()})
await railwayDb.connect()
try{
 if(intendedStaging){
  const meta=await railwayDb.query(`SELECT current_database() AS db,current_user AS role,
    has_column_privilege(current_user,'stayhub.accounts','id','SELECT') AS can_read,
    EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND
      (rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls)) AS elevated,
    EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member
      WHERE r.rolname=current_user) AS has_inherited_roles,
    EXISTS(SELECT 1 FROM pg_tables t WHERE t.schemaname='stayhub' AND
      (has_table_privilege(current_user,format('%I.%I',t.schemaname,t.tablename),'INSERT') OR
       has_table_privilege(current_user,format('%I.%I',t.schemaname,t.tablename),'UPDATE') OR
       has_table_privilege(current_user,format('%I.%I',t.schemaname,t.tablename),'DELETE') OR
       has_table_privilege(current_user,format('%I.%I',t.schemaname,t.tablename),'TRUNCATE'))) AS can_write`)
  if(meta.rows[0]?.db!=='railway'||meta.rows[0]?.role!=='stayhub_identity_reader'||
     meta.rows[0]?.can_read!==true||meta.rows[0]?.can_write!==false||
     meta.rows[0]?.elevated!==false||meta.rows[0]?.has_inherited_roles!==false)
   throw Error('REFUSED: Railway database role is not strictly read-only')
 }
 const accounts=await railwayDb.query('SELECT id FROM stayhub.accounts WHERE id=ANY($1::uuid[])',
  [[req.account,aAccount,bAccount]])
 if(accounts.rowCount!==3)
  throw Error('REFUSED: target and both approvers must exist in the independent Railway identity database')
 await neonDb.connect()
 try{
  await neonDb.query('BEGIN')
  try{
   await neonDb.query('SELECT pg_advisory_xact_lock(hashtext($1))',[req.account])
   // Duplicate approval request IDs must fail and rollback with no membership changes.
   const previous=await neonDb.query('SELECT 1 FROM stayhub_membership.platform_admin_events WHERE request_id=$1',[req.requestId])
   if(previous.rowCount)throw Error('REFUSED: previously processed approval request')
   if(req.action==='grant'){
    await neonDb.query(`INSERT INTO stayhub_membership.platform_admins
      (railway_account_id,enabled,granted_by,reason,revoked_at)
      VALUES($1,true,$2,$3,null)
      ON CONFLICT(railway_account_id) DO UPDATE SET
      enabled=true,granted_by=EXCLUDED.granted_by,
      reason=EXCLUDED.reason,revoked_at=null`,
      [req.account,'two-person-signed-approval',req.reason])
   }else{
    const existing=await neonDb.query(`UPDATE stayhub_membership.platform_admins
      SET enabled=false,revoked_at=now(),reason=$2
      WHERE railway_account_id=$1 AND enabled=true RETURNING railway_account_id`,
     [req.account,req.reason])
    if(existing.rowCount!==1)throw Error('REFUSED: admin is not active')
   }
   await neonDb.query(`INSERT INTO stayhub_membership.platform_admin_events
    (request_id,railway_account_id,action,approver_a_fingerprint,approver_b_fingerprint,
     approver_a_railway_account_id,approver_b_railway_account_id,reason)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [req.requestId,req.account,req.action,fingerprint(aKey),fingerprint(bKey),aAccount,bAccount,req.reason])
   await neonDb.query('COMMIT')
   console.log('PASS P6.4: authorized, identity-verified, dual-signed '+req.action+' with append-only audit event')
  }catch(err){await neonDb.query('ROLLBACK').catch(()=>{});throw err}
 }finally{await neonDb.end()}
}finally{await railwayDb.end()}
