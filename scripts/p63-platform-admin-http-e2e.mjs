#!/usr/bin/env node
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import pg from 'pg'
const base=process.env.P26_E2E_BASE
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||
 process.env.DATABASE_URL!=='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_p26_ci'||
 process.env.STAYHUB_MEMBERSHIP_DATABASE_URL!=='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_membership_ci')
 throw Error('REFUSED: isolated PostgreSQL only')
const db=new pg.Client({connectionString:process.env.STAYHUB_MEMBERSHIP_DATABASE_URL})
const tag=randomBytes(6).toString('hex')
async function signup(label){
 const response=await fetch(base+'/api/v2/register',{method:'POST',
  headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify({email:`p63-${label}-${tag}@example.invalid`,password:'P63-CI-Secret-12345!'})
 })
 assert.equal(response.status,201)
 const cookie=response.headers.get('set-cookie')?.split(';')[0]
 assert.ok(cookie)
 const me=await fetch(base+'/api/v2/me',{headers:{cookie}})
 assert.equal(me.status,200)
 return {id:(await me.json()).id,cookie}
}
async function listing(cookie,path='/api/v2/platform-members'){
 const r=await fetch(base+path,{headers:cookie?{cookie}:{}})
 return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')}
}
await db.connect()
try{
 assert.equal((await listing()).status,401)
 const member=await signup('member')
 const admin=await signup('admin')
 assert.equal((await listing(member.cookie)).status,403)
 assert.equal((await listing(admin.cookie)).status,403)
 const denied=await fetch(base+'/platform-admin',{headers:{cookie:member.cookie}})
 assert.equal(denied.status,200) // guarded page, no membership records
 assert.match(await denied.text(),/ไม่มีสิทธิ์เข้าถึง/)
 // Only direct CI fixture SQL can provision the admin; public API cannot.
 await db.query(`INSERT INTO stayhub_membership.platform_admins
   (railway_account_id,enabled,granted_by,reason) VALUES ($1,true,'CI fixture','isolated test only')`,[admin.id])
 await db.query(`INSERT INTO stayhub_membership.plans(code,title) VALUES('p63_plan','CI plan')
   ON CONFLICT DO NOTHING`)
 await db.query(`INSERT INTO stayhub_membership.memberships
   (railway_account_id,plan_code,status,starts_at,ends_at,updated_by)
   VALUES ($1,'p63_plan','active',now()-interval '1 day',now()+interval '30 days','CI')`,[member.id])
 const result=await listing(admin.cookie)
 assert.equal(result.status,200)
 assert.equal(result.cache,'no-store')
 assert.ok(result.body.items.some(x=>x.railway_account_id===member.id))
 assert.equal((await listing(member.cookie)).status,403)
 assert.equal((await listing(admin.cookie,'/api/v2/platform-members?offset=-1')).status,400)
 assert.equal((await listing(admin.cookie,'/api/v2/platform-members?q='+encodeURIComponent('z'.repeat(81)))).status,400)
 const render=await fetch(base+'/platform-admin',{headers:{cookie:admin.cookie}})
 assert.equal(render.status,200)
 const html=await render.text()
 assert.ok(html.includes(member.id),'admin can see UUID-only member list')
 assert.ok(!html.includes('CI-Secret'),'password never exposed in admin page')
 const attempt=await fetch(base+'/api/v2/platform-members',{method:'POST',headers:{cookie:member.cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({admin:true})})
 assert.equal(attempt.status,405)
 await db.query('UPDATE stayhub_membership.platform_admins SET enabled=false,revoked_at=now() WHERE railway_account_id=$1',[admin.id])
 assert.equal((await listing(admin.cookie)).status,403,'revocation takes effect on next request')
 console.log('PASS P6.3 platform admin no-default-role, server-side permission, revocation, read-only list and self-grant denial')
}finally{await db.end()}
