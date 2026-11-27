#!/usr/bin/env node
/**
 * P6.2: real read-only Neon membership readiness gate.
 * Called after guarded Railway DB migration preflight; never migrates Neon,
 * grants rights, provisions memberships, or displays connection credentials.
 */
import pg from 'pg'
const env=process.env
const raw=env.STAYHUB_MEMBERSHIP_DATABASE_URL
if(!raw)throw new Error('REFUSED: membership Neon URL missing')
const url=new URL(raw)
const inCi=env.CI==='true'&&
  env.P26_E2E_BASE==='http://127.0.0.1:3000'&&
  env.DATABASE_URL==='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_p26_ci'&&
  url.hostname==='127.0.0.1'&&url.pathname==='/stayhub_membership_ci'
if(!inCi){
  if(env.RAILWAY_PROJECT_ID!=='a8a5a434-4d18-438f-b4ea-ece072094595'||
     env.RAILWAY_ENVIRONMENT_NAME!=='production'||
     env.RAILWAY_ENVIRONMENT_ID!=='c9c4b13a-9041-4ae6-bd50-2d02b546b053')
    throw new Error('REFUSED: membership verification target must be approved production')
  if(!env.STAYHUB_MEMBERSHIP_NEON_HOST||
     !env.STAYHUB_MEMBERSHIP_NEON_HOST.endsWith('.neon.tech')||
     url.hostname!==env.STAYHUB_MEMBERSHIP_NEON_HOST||
     url.pathname!=='/neondb' ||
     decodeURIComponent(url.username)!=='stayhub_membership_reader')
    throw new Error('REFUSED: membership Neon read-only identity mismatch')
  url.searchParams.set('sslmode','verify-full')
}
if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('REFUSED: invalid membership DB protocol')
const pool=new pg.Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000,
  application_name:'stayhub-membership-cutover-preflight'})
try{
  const client=await pool.connect()
  try{
    await client.query('BEGIN READ ONLY')
    const identity=await client.query(`SELECT current_database() db,
      current_user AS role,
      has_schema_privilege(current_user,'stayhub_membership','USAGE') AS membership_schema,
      has_table_privilege(current_user,'stayhub_membership.memberships','SELECT') AS can_read_members,
      has_table_privilege(current_user,'stayhub_membership.plans','SELECT') AS can_read_plans,
      has_table_privilege(current_user,'stayhub_membership.memberships','INSERT') AS can_insert_members,
      CASE WHEN to_regnamespace('stayhub') IS NULL THEN false ELSE has_schema_privilege(current_user,'stayhub','USAGE') END AS can_use_operational_schema`)
    const r=identity.rows[0]
    if(r.db!==(inCi?'stayhub_membership_ci':'neondb')||
       (!inCi&&r.role!=='stayhub_membership_reader')||
       !r.membership_schema||!r.can_read_members||!r.can_read_plans||
       (!inCi&&(r.can_insert_members||r.can_use_operational_schema)))
      throw new Error('REFUSED: membership read-only schema/role verification failed')
    // Actually read each critical relation and prove the schema is reachable.
    await client.query(`SELECT count(*)::int AS c FROM stayhub_membership.memberships`)
    await client.query(`SELECT count(*)::int AS c FROM stayhub_membership.plans`)
    await client.query(`SELECT count(*)::int AS c FROM stayhub_membership.entitlements`)
    await client.query('ROLLBACK')
    console.log('PASS P6.2 membership database identity, read-only access and schema checks (no credentials disclosed)')
  }catch(err){try{await client.query('ROLLBACK')}catch{};throw err}
  finally{client.release()}
}finally{await pool.end()}
