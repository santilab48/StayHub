#!/usr/bin/env node
/**
 * Apply only reviewed sequential SQL files to a dedicated Railway production DB.
 * Run only as a controlled production pre-deploy step; preserve Railway DATABASE_URL for rollback.
 *
 * Requires RAILWAY_ENVIRONMENT_NAME=production,
 * RAILWAY_PROJECT_ID=<expected StayHub project id> and DATABASE_URL.
 */
import {readFileSync,readdirSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import pg from 'pg'

const EXPECTED_PROJECT = 'a8a5a434-4d18-438f-b4ea-ece072094595'
const EXPECTED_ENVIRONMENT = 'c9c4b13a-9041-4ae6-bd50-2d02b546b053'
const env = process.env
const dryRun = process.argv.includes('--dry-run')
const checkOnly = process.argv.includes('--check')

if(env.RAILWAY_ENVIRONMENT_NAME !== 'production') {
  throw new Error('REFUSED: RAILWAY_ENVIRONMENT_NAME must be production')
}
if(env.RAILWAY_ENVIRONMENT_ID !== EXPECTED_ENVIRONMENT) {
  throw new Error('REFUSED: incorrect Railway production environment id')
}
if(env.RAILWAY_PROJECT_ID !== EXPECTED_PROJECT) {
  throw new Error('REFUSED: incorrect Railway project id')
}
const neonProduction = env.STAYHUB_DB_PROVIDER === 'neon-production'
if (!env.DATABASE_URL) throw new Error('REFUSED: Railway rollback DATABASE_URL is missing')
if (neonProduction && !env.STAYHUB_NEON_PRODUCTION_URL)
  throw new Error('REFUSED: STAYHUB_NEON_PRODUCTION_URL is missing')
let connectionString = neonProduction ? env.STAYHUB_NEON_PRODUCTION_URL : env.DATABASE_URL
if (neonProduction) {
  const url = new URL(connectionString)
  if (!env.STAYHUB_NEON_PRODUCTION_HOST ||
      !url.hostname.endsWith('.neon.tech') ||
      url.hostname !== env.STAYHUB_NEON_PRODUCTION_HOST ||
      url.pathname !== '/neondb' ||
      !['postgres:','postgresql:'].includes(url.protocol))
    throw new Error('REFUSED: Neon production endpoint identity mismatch')
  url.searchParams.set('sslmode','verify-full')
  connectionString = url.toString()
}

const dirname = resolve('db/migrations')
const files = readdirSync(dirname).filter(x=>/^\d{3}_[\w-]+\.sql$/.test(x)).sort()
if(!files.length) throw new Error('No migrations found')
const migrations = files.map(name=>{
  const sql = readFileSync(join(dirname,name),'utf8')
  if(/\b(BEGIN|COMMIT|ROLLBACK)\s*;/i.test(sql)) throw new Error(`File ${name} contains transaction control`)
  return {name,sql,checksum:createHash('sha256').update(sql).digest('hex')}
})

if(dryRun){
  console.log('Migrations available (dry run; no connection):')
  migrations.forEach(({name,checksum})=>console.log(name,checksum))
  process.exit(0)
}

const pool = new pg.Pool({connectionString,max:1,connectionTimeoutMillis:10000})
const client=await pool.connect()
try {
  // Read-only preflight; never disclose connection string.
  const db = await client.query("SELECT current_database() AS name, current_user AS db_user")
  if(env.STAYHUB_DATABASE_ROLE!=='production') throw new Error('REFUSED: production database role flag missing')
  if(db.rows[0].name!==(neonProduction?'neondb':'railway'))
    throw new Error('REFUSED: unexpected production database name')
  if(neonProduction && db.rows[0].db_user!=='neondb_owner')
    throw new Error('REFUSED: unexpected Neon production database role')
  if(neonProduction && (client.connection.stream.encrypted!==true ||
      client.connection.stream.authorized!==true))
    throw new Error('REFUSED: Neon production TLS certificate not verified')
  const addr=await client.query("SELECT inet_server_addr()::text AS address")
  if(!addr.rows[0]?.address) throw new Error('REFUSED: database server address not verified')
  console.log('Production DB environment and identity verified (no credentials disclosed)')
  // A transaction-level advisory lock prevents concurrent migration runs.
  await client.query('BEGIN')
  try{
    await client.query('SELECT pg_advisory_xact_lock(832615021)')
    if(checkOnly) {
      const exists=await client.query("SELECT to_regclass('stayhub.schema_migrations') AS migration_table")
      const applied = exists.rows[0]?.migration_table
        ? (await client.query('SELECT filename,checksum FROM stayhub.schema_migrations ORDER BY filename')).rows
        : []
      console.log('Applied migrations:',applied.length)
      for(const m of migrations){
        const prev=applied.find(row=>row.filename===m.name)
        if(prev&&prev.checksum!==m.checksum)throw new Error(`Checksum mismatch: ${m.name}`)
        console.log(m.name,prev?'APPLIED':'PENDING')
      }
      await client.query('ROLLBACK')
      process.exitCode=0
    }else if(neonProduction) {
      // Cutover is a checksum-only preflight. Never apply or repair schema on
      // Neon Production as an automatic side effect of deploying the app.
      const applied=(await client.query('SELECT filename,checksum FROM stayhub.schema_migrations ORDER BY filename')).rows
      if(applied.length!==migrations.length || migrations.some(m=>
        !applied.some(row=>row.filename===m.name && row.checksum===m.checksum)))
        throw new Error('REFUSED: Neon production migration history mismatch or pending migration')
      console.log('Neon production migration history verified; no migration executed')
      await client.query('COMMIT')
    }else {
      await client.query('CREATE SCHEMA IF NOT EXISTS stayhub')
      await client.query(`CREATE TABLE IF NOT EXISTS stayhub.schema_migrations (
        filename text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`)
      for(const m of migrations){
        const r=await client.query('SELECT checksum FROM stayhub.schema_migrations WHERE filename=$1',[m.name])
        if(r.rows.length){
          if(r.rows[0].checksum!==m.checksum)throw new Error(`Checksum mismatch: ${m.name}`)
          console.log('SKIP',m.name)
          continue
        }
        await client.query(m.sql)
        await client.query('INSERT INTO stayhub.schema_migrations(filename,checksum) VALUES($1,$2)',[m.name,m.checksum])
        console.log('APPLIED',m.name)
      }
      await client.query('COMMIT')
    }
  }catch(err){
    try{await client.query('ROLLBACK')}catch{}
    throw err
  }
}finally {
  client.release()
  await pool.end()
}
