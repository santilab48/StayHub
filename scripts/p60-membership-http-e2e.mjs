#!/usr/bin/env node
// P6.0 isolated real HTTP + two independent databases integration test.
// Neon membership table is simulated in a DIFFERENT localhost PostgreSQL CI database.
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import pg from 'pg'

const base=process.env.P26_E2E_BASE
const primary=process.env.DATABASE_URL
const member=process.env.STAYHUB_MEMBERSHIP_DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||
   primary!=='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_p26_ci'||
   member!=='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_membership_ci') {
  throw new Error('REFUSED: membership E2E requires two disposable localhost CI PostgreSQL databases')
}
const client=new pg.Client({connectionString:member})
const tag=randomBytes(7).toString('hex')
const password='P60-isolated-membership-Strong-123!'
async function signup(label) {
  const response=await fetch(base+'/api/v2/register',{
    method:'POST',headers:{'content-type':'application/json',origin:base},
    body:JSON.stringify({email:`p60-${label}-${tag}@example.invalid`,password}),
  })
  assert.equal(response.status,201,'isolated account registration')
  const data=await response.json()
  return {id:data.id,cookie:response.headers.get('set-cookie')?.split(';')[0]}
}
async function query(cookie) {
  const response=await fetch(base+'/api/v2/membership',{headers:cookie?{cookie}:{}})
  return {status:response.status,body:await response.json(),cache:response.headers.get('cache-control')}
}
await client.connect()
try {
  assert.equal((await query()).status,401,'anonymous cannot read any benefits')
  const owner=await signup('owner')
  const other=await signup('other')
  assert.match(owner.id,/^[0-9a-f-]{36}$/i)
  assert.ok(owner.cookie)
  assert.equal((await query(owner.cookie)).status,200)
  assert.deepEqual((await query(owner.cookie)).body.membership,{
    plan:null,status:'none',expiresAt:null,entitlements:[],
  },'unprovisioned users are never premium')

  // Fixture-only administrative database inserts; NO API permits this operation.
  await client.query(`INSERT INTO stayhub_membership.plans(code,title)
    VALUES('pro','Pro'),('inactive','Disabled plan')`)
  await client.query(`INSERT INTO stayhub_membership.entitlements(code)
    VALUES('priority_support'),('advanced_reports')`)
  await client.query(`INSERT INTO stayhub_membership.plan_entitlements(plan_code,entitlement_code)
    VALUES('pro','priority_support'),('pro','advanced_reports')`)
  await client.query(`INSERT INTO stayhub_membership.memberships
    (railway_account_id,plan_code,status,starts_at,ends_at,updated_by)
    VALUES ($1,'pro','active',now()-interval '1 day',now()+interval '30 days','CI administrator')`,[owner.id])
  const active=await query(owner.cookie)
  assert.equal(active.status,200)
  assert.deepEqual(active.body.membership.entitlements,['advanced_reports','priority_support'])
  assert.equal(active.body.membership.status,'active')
  assert.equal(active.body.membership.plan,'pro')
  assert.equal(active.cache,'no-store')
  assert.deepEqual((await query(other.cookie)).body.membership.entitlements,[],
    'separate Railway account cannot inherit premium')
  console.log('PASS Neon membership separate-db plan and benefits bound to Railway account session')

  await client.query(`UPDATE stayhub_membership.memberships
    SET ends_at=now()-interval '1 hour',starts_at=now()-interval '31 days'
    WHERE railway_account_id=$1`,[owner.id])
  const expired=(await query(owner.cookie)).body.membership
  assert.equal(expired.status,'expired')
  assert.deepEqual(expired.entitlements,[])
  await client.query(`UPDATE stayhub_membership.memberships
    SET status='suspended', ends_at=now()+interval '30 days'
    WHERE railway_account_id=$1`,[owner.id])
  const suspended=(await query(owner.cookie)).body.membership
  assert.equal(suspended.status,'suspended')
  assert.deepEqual(suspended.entitlements,[])
  console.log('PASS expired/suspended memberships fail closed despite plan entitlements')

  const write=await fetch(base+'/api/v2/membership',{
    method:'POST',headers:{origin:base,cookie:owner.cookie,'content-type':'application/json'},
    body:JSON.stringify({plan:'pro',status:'active',entitlements:['priority_support']}),
  })
  assert.equal(write.status,405,'client must not be able to grant premium or extend memberships')
  console.log('PASS public Membership API read-only; no client entitlement issuance')
  console.log('PASS P6.0 Railway-primary / separate-Neon-membership HTTP E2E')
} finally { await client.end() }
