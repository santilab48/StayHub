#!/usr/bin/env node
// Read-only verification on the existing Railway Staging PostgreSQL.
// Does not create roles, alter grants, or print credentials.
import pg from 'pg'

const e=process.env
if(e.RAILWAY_PROJECT_ID!=='a8a5a434-4d18-438f-b4ea-ece072094595'||
   e.RAILWAY_ENVIRONMENT_NAME!=='staging'||
   e.RAILWAY_ENVIRONMENT_ID!=='ced39691-4fe7-4707-bba7-6d0e801f1ff8')
  throw Error('REFUSED: expected StayHub Railway staging only')
if(!e.DATABASE_URL)throw Error('REFUSED: missing Railway staging database connection')
const u=new URL(e.DATABASE_URL)
if(!['postgres:','postgresql:'].includes(u.protocol)||
   u.hostname.endsWith('.neon.tech')||
   u.pathname!=='/railway')throw Error('REFUSED: requires isolated Railway staging Postgres')

const db=new pg.Client({connectionString:e.DATABASE_URL,connectionTimeoutMillis:10000})
await db.connect()
try{
  await db.query('BEGIN READ ONLY')
  try {
    const name=await db.query('SELECT current_database() AS db')
    if(name.rows[0]?.db!=='railway')throw Error('REFUSED: unexpected staging database')
    const role=await db.query(`
      SELECT r.rolname,r.rolcanlogin,r.rolsuper,r.rolcreatedb,r.rolcreaterole,
        r.rolreplication,r.rolbypassrls,
        has_schema_privilege(r.oid,'stayhub','USAGE') AS schema_usage,
        has_column_privilege(r.oid,'stayhub.accounts','id','SELECT') AS account_id_select,
        has_column_privilege(r.oid,'stayhub.accounts','email','SELECT') AS email_select,
        has_table_privilege(r.oid,'stayhub.accounts','INSERT') AS can_insert_accounts,
        EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS inherits_roles,
        EXISTS(SELECT 1 FROM pg_tables t WHERE t.schemaname='stayhub' AND
          (has_table_privilege(r.oid,format('%I.%I',t.schemaname,t.tablename),'INSERT') OR
           has_table_privilege(r.oid,format('%I.%I',t.schemaname,t.tablename),'UPDATE') OR
           has_table_privilege(r.oid,format('%I.%I',t.schemaname,t.tablename),'DELETE') OR
           has_table_privilege(r.oid,format('%I.%I',t.schemaname,t.tablename),'TRUNCATE'))) AS can_write
      FROM pg_roles r WHERE r.rolname='stayhub_identity_reader'`)
    const x=role.rows[0]
    if(!x)throw Error('BLOCKED P6.5: stayhub_identity_reader does not exist on Railway Staging')
    if(!x.rolcanlogin||x.rolsuper||x.rolcreatedb||x.rolcreaterole||
       x.rolreplication||x.rolbypassrls||x.inherits_roles||!x.schema_usage||
       !x.account_id_select||x.email_select||x.can_insert_accounts||x.can_write)
      throw Error('BLOCKED P6.5: Railway staging identity reader has incorrect privileges')
    await db.query('ROLLBACK')
    console.log('PASS P6.5 Railway Staging stayhub_identity_reader role: account UUID SELECT only and no operational writes')
  }catch(err){await db.query('ROLLBACK').catch(()=>{});throw err}
}finally{await db.end()}
