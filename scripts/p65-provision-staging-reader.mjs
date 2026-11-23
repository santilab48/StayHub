#!/usr/bin/env node
/**
 * One-time, guarded Railway STAGING-only creation of an account-UUID reader.
 * Requires STAYHUB_P65_READER_PROVISION_APPROVED=YES and a generated secret
 * stored in Railway Staging variables. Never prints secret, URL or real account data.
 * No Production path is accepted.
 */
import pg from 'pg'
const e=process.env
const role='stayhub_identity_reader'
const pw=e.STAYHUB_P65_IDENTITY_READER_PASSWORD
if(e.RAILWAY_PROJECT_ID!=='a8a5a434-4d18-438f-b4ea-ece072094595'||
 e.RAILWAY_ENVIRONMENT_NAME!=='staging'||
 e.RAILWAY_ENVIRONMENT_ID!=='ced39691-4fe7-4707-bba7-6d0e801f1ff8'||
 e.STAYHUB_P65_READER_PROVISION_APPROVED!=='YES')
 throw Error('REFUSED: one-time P6.5 role provisioning requires approved Railway Staging identity')
if(!pw||pw.length<40||pw.length>128||!/^[A-Za-z0-9_-]+$/.test(pw))
 throw Error('REFUSED: a securely generated Railway-managed reader credential is required')
if(!e.DATABASE_URL)throw Error('REFUSED: staging DATABASE_URL missing')
const url=new URL(e.DATABASE_URL)
if(!['postgres:','postgresql:'].includes(url.protocol)||
 url.pathname!=='/railway'||url.hostname.endsWith('.neon.tech')||
 !url.hostname.endsWith('.railway.internal'))
 throw Error('REFUSED: expected private Railway Staging PostgreSQL only')
const admin=new pg.Client({connectionString:url.toString(),connectionTimeoutMillis:10000})
await admin.connect()
try{
 await admin.query('BEGIN')
 try{
  await admin.query('SELECT pg_advisory_xact_lock(846513221)')
  const identity=await admin.query('SELECT current_database() db')
  if(identity.rows[0]?.db!=='railway')throw Error('REFUSED: wrong database')
  const exists=await admin.query('SELECT oid FROM pg_roles WHERE rolname=$1',[role])
  if(exists.rowCount)throw Error('REFUSED: role exists; use read-only checker instead')
  // Create a non-inheriting role with no admin powers, a generated password, and no memberships.
  const create=await admin.query(`SELECT format(
   'CREATE ROLE %I WITH LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', $1, $2
  ) AS sql`,[role,pw])
  await admin.query(create.rows[0].sql)
  await admin.query('GRANT USAGE ON SCHEMA stayhub TO stayhub_identity_reader')
  await admin.query('GRANT SELECT(id) ON TABLE stayhub.accounts TO stayhub_identity_reader')
  await admin.query('COMMIT')
 }catch(err){await admin.query('ROLLBACK').catch(()=>{});throw err}
}finally{await admin.end()}
// Actual login as the new restricted role: SELECT UUID succeeds,
// email and property access and DML permission must remain denied.
const readerUrl=new URL(url.toString())
readerUrl.username=role
readerUrl.password=pw
const reader=new pg.Client({connectionString:readerUrl.toString(),connectionTimeoutMillis:10000})
await reader.connect()
try{
 const who=await reader.query('SELECT current_user AS role, current_database() AS db')
 if(who.rows[0]?.role!==role||who.rows[0]?.db!=='railway')throw Error('REFUSED: reader login mismatch')
 await reader.query('SELECT id FROM stayhub.accounts LIMIT 1')
 for(const sql of [
  'SELECT email FROM stayhub.accounts LIMIT 0',
  'SELECT id FROM stayhub.properties LIMIT 0',
  'EXPLAIN DELETE FROM stayhub.accounts WHERE false'
 ]){
  try{await reader.query(sql);throw Error('REFUSED: reader unexpectedly has extra permissions')}
  catch(err){if(err.code!=='42501')throw err}
 }
 console.log('PASS P6.5 live Railway Staging reader login: account UUID only, email/property denied, no DELETE rights')
}finally{await reader.end()}
