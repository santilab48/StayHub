#!/usr/bin/env node
import assert from 'node:assert/strict'
import {generateKeyPairSync,sign as signCrypto,randomUUID} from 'node:crypto'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import pg from 'pg'
const primary='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_p26_ci'
const member='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_membership_ci'
if(process.env.CI!=='true'||process.env.DATABASE_URL!==primary||
 process.env.STAYHUB_MEMBERSHIP_DATABASE_URL!==member||
 process.env.P26_E2E_BASE!=='http://127.0.0.1:3000')
 throw Error('REFUSED: only isolated localhost CI databases')
const rail=new pg.Client({connectionString:primary})
const neon=new pg.Client({connectionString:member})
const {privateKey:a,publicKey:ap}=generateKeyPairSync('ed25519')
const {privateKey:b,publicKey:bp}=generateKeyPairSync('ed25519')
const approvers={
 STAYHUB_P64_APPROVER_A_SPKI_B64:ap.export({type:'spki',format:'der'}).toString('base64'),
 STAYHUB_P64_APPROVER_B_SPKI_B64:bp.export({type:'spki',format:'der'}).toString('base64'),
}
const temporary=mkdtempSync(join(tmpdir(),'stayhub-p64-'))
function makeArtifact(request,opts={}){
 const canonical=Buffer.from(JSON.stringify(request))
 const signatures={
  a:signCrypto(null,canonical,a).toString('base64'),
  b:signCrypto(null,canonical,b).toString('base64'),
 }
 if(opts.badSig)signatures.b=signatures.a
 const file=join(temporary,randomUUID()+'.json')
 writeFileSync(file,JSON.stringify({request,signatures}),{mode:0o600})
 return file
}
const env={...process.env,STAYHUB_MEMBERSHIP_ADMIN_DATABASE_URL:member,
 STAYHUB_P64_RAILWAY_READONLY_URL:primary,...approvers}
function provision(path,expectSuccess=true,extraEnv={}){
 try{
  const output=execFileSync(process.execPath,['scripts/p64-platform-admin-provision.mjs',path],{
   env:{...env,...extraEnv},encoding:'utf8',stdio:['ignore','pipe','pipe'],
  })
  if(!expectSuccess)throw Error('Unexpected privilege grant: '+output)
  assert.match(output,/PASS P6.4/)
 }catch(e){
  if(expectSuccess)throw e
  assert.ok(e.status!==undefined,'Expected CLI refusal, not test assertion')
 }
}
const expires=()=>new Date(Date.now()+5*60*1000).toISOString()
const request=(account,action,reason='two independent approved CI signatures')=>({
 action,account,reason,requestId:randomUUID(),expiresAt:expires()
})
await rail.connect()
await neon.connect()
try{
 const accountId=randomUUID()
 await rail.query('INSERT INTO stayhub.accounts(id,email) VALUES($1,$2)',[accountId,'p64-'+randomUUID()+'@example.invalid'])
 const nonexistent=randomUUID()
 provision(makeArtifact(request(nonexistent,'grant')),false)
 provision(makeArtifact(request(accountId,'grant'),{badSig:true}),false)
 provision(makeArtifact(request(accountId,'grant')),false,{STAYHUB_P64_APPROVER_B_SPKI_B64:approvers.STAYHUB_P64_APPROVER_A_SPKI_B64})
 const grant=makeArtifact(request(accountId,'grant'))
 provision(grant)
 let result=await neon.query('SELECT enabled,revoked_at FROM stayhub_membership.platform_admins WHERE railway_account_id=$1',[accountId])
 assert.equal(result.rows[0].enabled,true)
 assert.equal(result.rows[0].revoked_at,null)
 provision(grant,false)
 let count=await neon.query('SELECT count(*)::int AS c FROM stayhub_membership.platform_admin_events WHERE railway_account_id=$1',[accountId])
 assert.equal(count.rows[0].c,1,'replayed request adds no audit event')
 const revoke=makeArtifact(request(accountId,'revoke'))
 provision(revoke)
 result=await neon.query('SELECT enabled,revoked_at FROM stayhub_membership.platform_admins WHERE railway_account_id=$1',[accountId])
 assert.equal(result.rows[0].enabled,false)
 assert.ok(result.rows[0].revoked_at)
 provision(revoke,false)
 count=await neon.query('SELECT count(*)::int AS c FROM stayhub_membership.platform_admin_events WHERE railway_account_id=$1',[accountId])
 assert.equal(count.rows[0].c,2)
 await assert.rejects(neon.query('DELETE FROM stayhub_membership.platform_admin_events WHERE railway_account_id=$1',[accountId]),/append-only/)
 await assert.rejects(neon.query('UPDATE stayhub_membership.platform_admin_events SET reason=$1 WHERE railway_account_id=$2',['corrupted',accountId]),/append-only/)
 console.log('PASS P6.4 dual signed approvers, Railway identity, no replay, revocation, immutable audit, no default rights')
}finally{
 await neon.end();await rail.end();rmSync(temporary,{force:true,recursive:true})
}
