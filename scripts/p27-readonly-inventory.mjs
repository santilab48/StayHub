#!/usr/bin/env node
/**
 * P2.7-A: read-only, explicit Railway Production inventory.
 * Prints metadata and per-table counts only; no row contents or credentials.
 *
 * Run from a trusted shell *with the existing Production DATABASE_URL* and
 * exactly matching Railway production identity environment variables.
 * Never run automatically in a production deploy hook.
 */
import pg from 'pg'

const expected = {
  RAILWAY_PROJECT_ID: 'a8a5a434-4d18-438f-b4ea-ece072094595',
  RAILWAY_ENVIRONMENT_ID: 'c9c4b13a-9041-4ae6-bd50-2d02b546b053',
  RAILWAY_ENVIRONMENT_NAME: 'production',
  STAYHUB_DATABASE_ROLE: 'production',
}
if (process.env.P27_READ_ONLY_AUDIT !== 'YES') {
  throw new Error('REFUSED: P27_READ_ONLY_AUDIT=YES must be set explicitly')
}
for (const [name,value] of Object.entries(expected)) {
  if (process.env[name] !== value) {
    throw new Error(`REFUSED: unexpected ${name}`)
  }
}
const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('REFUSED: DATABASE_URL is missing')
const client = new pg.Client({connectionString,connectionTimeoutMillis:10000,
  application_name:'stayhub-p27-readonly-inventory'})
let inTransaction = false
try {
  await client.connect()
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
  inTransaction = true
  await client.query("SET LOCAL statement_timeout = '10s'")
  const identity = await client.query(
    "SELECT current_database() AS database_name, current_user AS username, current_setting('transaction_read_only') AS read_only"
  )
  const db = identity.rows[0]
  if(db.database_name !== 'railway' || db.read_only !== 'on')
    throw new Error('REFUSED: unexpected target database or writable transaction')
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='stayhub' AND table_type='BASE TABLE' ORDER BY table_name"
  )
  if(!tables.rows.some(row=>row.table_name==='schema_migrations'))
    throw new Error('REFUSED: schema_migrations missing')
  const migrations = await client.query(
    'SELECT filename,checksum FROM stayhub.schema_migrations ORDER BY filename'
  )
  const counts = {}
  for(const row of tables.rows){
    if(!/^[a-z_]+$/.test(row.table_name))
      throw new Error('Unexpected table name')
    const count = await client.query(`SELECT count(*)::bigint AS n FROM stayhub."${row.table_name}"`)
    counts[row.table_name] = count.rows[0].n
  }
  // Billing amounts are aggregates only; no customer, owner or bank data.
  const billingTableNames=['billing_bills','billing_payments']
  const available=new Set(tables.rows.map(row=>row.table_name))
  const hasBilling=billingTableNames.every(name=>available.has(name))
  if(available.size>=20 && !hasBilling)
    throw new Error('REFUSED: expected production billing tables are missing')
  const billing=hasBilling ? {
    bills:(await client.query(`SELECT count(*)::bigint AS rows,
      coalesce(sum(total),0)::text AS total_amount,
      count(*) FILTER(WHERE status='paid')::bigint AS paid_rows
      FROM stayhub.billing_bills`)).rows[0],
    payments:(await client.query(`SELECT count(*)::bigint AS rows,
      coalesce(sum(amount),0)::text AS total_amount
      FROM stayhub.billing_payments`)).rows[0],
  } : null
  const extensions=(await client.query(
    "SELECT extname,extversion FROM pg_extension ORDER BY extname"
  )).rows
  await client.query('COMMIT')
  inTransaction = false
  const result = {
    environment: 'railway-production',
    database: db.database_name,
    tables: tables.rowCount,
    migrations: migrations.rows,
    rowCounts: counts,
    billingAggregates: billing,
    installedExtensions: extensions,
    capturedAt: new Date().toISOString(),
  }
  console.log(JSON.stringify(result,null,2))
}catch(error){
  if(inTransaction) await client.query('ROLLBACK').catch(()=>{})
  throw error
}finally{
  await client.end().catch(()=>{})
}
