#!/usr/bin/env node
// Explicitly authorized, audited provisioning only. No public HTTP grant endpoint.
// Never connect to Railway business data or any unverified Production Neon target.
import { Client } from 'pg'

function arg(key) { return process.argv.find(item=>item.startsWith('--'+key+'='))?.slice(key.length+3) }
const account=arg('account'),plan=arg('plan'),status=arg('status')
const starts=arg('starts'),ends=arg('ends')
const actor=arg('actor'),reason=arg('reason')
if(!account||!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(account)||
   !plan||!/^[a-z][a-z0-9_]{1,31}$/.test(plan)||
   !['trial','active','expired','suspended','cancelled'].includes(status)||
   !starts||!ends||!Number.isFinite(Date.parse(starts))||!Number.isFinite(Date.parse(ends))||
   Date.parse(ends)<=Date.parse(starts)||!actor||actor.trim().length>120||
   !reason||reason.trim().length>500)throw Error('Missing or invalid provisioning arguments')
if(process.env.STAYHUB_MEMBERSHIP_PROVISION_APPROVED!=='YES')
  throw Error('REFUSED: explicit membership provisioning approval required')
const raw=process.env.STAYHUB_MEMBERSHIP_ADMIN_DATABASE_URL
if(!raw)throw Error('REFUSED: membership admin database URL not provided')
const url=new URL(raw)
if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('REFUSED: invalid database URL')
const isCi=process.env.CI==='true'&&url.hostname==='127.0.0.1'&&
  url.pathname==='/stayhub_membership_ci'&&
  process.env.DATABASE_URL==='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_p26_ci'
if(!isCi) {
  if(process.env.RAILWAY_PROJECT_ID!=='a8a5a434-4d18-438f-b4ea-ece072094595'||
     !['production','staging'].includes(process.env.RAILWAY_ENVIRONMENT_NAME)||
     !process.env.STAYHUB_MEMBERSHIP_NEON_HOST||
     !process.env.STAYHUB_MEMBERSHIP_NEON_HOST.endsWith('.neon.tech')||
     url.hostname!==process.env.STAYHUB_MEMBERSHIP_NEON_HOST||
     url.pathname!=='/neondb')throw Error('REFUSED: unapproved Neon membership target')
  if(process.env.RAILWAY_ENVIRONMENT_NAME==='production'&&
     process.env.RAILWAY_ENVIRONMENT_ID!=='c9c4b13a-9041-4ae6-bd50-2d02b546b053')
    throw Error('REFUSED: incorrect production environment')
  if(process.env.RAILWAY_ENVIRONMENT_NAME==='staging'&&
     process.env.RAILWAY_ENVIRONMENT_ID!=='ced39691-4fe7-4707-bba7-6d0e801f1ff8')
    throw Error('REFUSED: incorrect staging environment')
  url.searchParams.set('sslmode','verify-full')
}
const client=new Client({connectionString:url.toString()})
await client.connect()
try {
  await client.query('BEGIN')
  // The lock serializes simultaneous changes for the same member identity.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[account])
  const exists=await client.query(
    'SELECT 1 FROM stayhub_membership.plans WHERE code=$1 AND active=true',[plan])
  if(!exists.rowCount)throw Error('Requested plan does not exist or is inactive')
  await client.query(`INSERT INTO stayhub_membership.memberships
    (railway_account_id,plan_code,status,starts_at,ends_at,updated_by)
    VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT (railway_account_id) DO UPDATE SET
      plan_code=EXCLUDED.plan_code,status=EXCLUDED.status,
      starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,
      updated_at=now(),updated_by=EXCLUDED.updated_by,
      version=stayhub_membership.memberships.version+1`,
    [account,plan,status,starts,ends,actor])
  await client.query(`INSERT INTO stayhub_membership.membership_events
    (railway_account_id,plan_code,status,starts_at,ends_at,actor,reason)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [account,plan,status,starts,ends,actor,reason])
  await client.query('COMMIT')
  console.log('Membership provisioned with immutable audit event (no credentials disclosed)')
}catch(e) {
  await client.query('ROLLBACK').catch(()=>{})
  throw e
}finally{await client.end()}
