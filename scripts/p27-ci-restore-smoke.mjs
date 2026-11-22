#!/usr/bin/env node
/**
 * P2.7-B: FULL backup and restore rehearsal on two disposable CI PostgreSQL
 * databases. Refuses real Railway / Neon endpoints. Uses real pg_dump and
 * pg_restore and compares exact row counts, migration hashes and constraints.
 */
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,statSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import pg from 'pg'

if (process.env.CI !== 'true' || process.env.P27_DISPOSABLE_RESTORE !== 'YES')
  throw new Error('REFUSED: disposable CI-only restore rehearsal')
const sourceUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/stayhub_p26_ci'
const targetUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/stayhub_p27_restore'
if(process.env.DATABASE_URL !== sourceUrl ||
   process.env.P27_RESTORE_TARGET_URL !== targetUrl)
  throw new Error('REFUSED: unexpected source or target (must be two isolated localhost CI databases)')
const sourceDb = new pg.Client({connectionString:sourceUrl})
const targetDb = new pg.Client({connectionString:targetUrl})
const tmp=mkdtempSync(join(tmpdir(),'stayhub-p27-backup-'))
const backup=join(tmp,'stayhub.dump')
const cmdEnv={...process.env,PGHOST:'127.0.0.1',PGPORT:'5432',
  PGUSER:'postgres',PGPASSWORD:'postgres',PGSSLMODE:'disable'}
function run(command,args) {
  const r=spawnSync(command,args,{encoding:'utf8',env:cmdEnv,timeout:60000})
  if(r.error||r.status!==0)
    throw new Error(command+' failed: '+(r.error?.message||r.stderr||r.status).slice(0,800))
  return r.stdout
}
async function counts(c){
  const r=await c.query(`SELECT table_name FROM information_schema.tables
    WHERE table_schema='stayhub' AND table_type='BASE TABLE' ORDER BY table_name`)
  const rows={}
  for(const {table_name} of r.rows){
    assert.match(table_name,/^[a-z_]+$/)
    const q=await c.query('SELECT count(*)::bigint AS n FROM stayhub."'+table_name+'"')
    rows[table_name]=q.rows[0].n
  }
  return rows
}
async function migrationHistory(c){
  return (await c.query('SELECT filename,checksum FROM stayhub.schema_migrations ORDER BY filename')).rows
}
try {
  await sourceDb.connect()
  await targetDb.connect()
  // Synthetic fixture with several foreign-key links and password hashes.
  await sourceDb.query('BEGIN')
  try{
    const account=await sourceDb.query(`INSERT INTO stayhub.accounts(email,password_hash)
      VALUES('p27-restorable@example.invalid','not-a-real-password-hash') RETURNING id`)
    const id=account.rows[0].id
    const property=await sourceDb.query(`INSERT INTO stayhub.properties(owner_account_id,name,property_type)
      VALUES($1,'P27 Restore Fixture','apartment') RETURNING id`,[id])
    const propId=property.rows[0].id
    await sourceDb.query(`INSERT INTO stayhub.property_memberships(property_id,account_id,role)
      VALUES($1,$2,'owner')`,[propId,id])
    await sourceDb.query(`INSERT INTO stayhub.units(property_id,name)
      VALUES($1,'P27-101')`,[propId])
    await sourceDb.query('COMMIT')
  }catch(e){await sourceDb.query('ROLLBACK');throw e}
  const before=await counts(sourceDb)
  const history=await migrationHistory(sourceDb)
  assert.equal(history.length,11,'Expected all 11 reviewed migrations')
  assert.equal(before.accounts,'1')
  assert.equal(before.properties,'1')
  assert.equal(before.units,'1')
  console.log('PASS source fixture and 11 migration records established')

  run('pg_dump',['--format=custom','--schema=stayhub','--no-owner',
    '--no-acl','--file='+backup,'--dbname=stayhub_p26_ci'])
  assert.ok(statSync(backup).size>1000,'Backup archive unexpectedly small')
  const entries=run('pg_restore',['--list',backup])
  assert.match(entries,/stayhub/)
  console.log('PASS PostgreSQL custom-format schema/data backup and archive listing')

  run('pg_restore',['--exit-on-error','--single-transaction','--no-owner',
    '--no-acl','--dbname=stayhub_p27_restore',backup])
  const after=await counts(targetDb)
  assert.deepEqual(after,before,'Restored table counts do not match snapshot')
  assert.deepEqual(await migrationHistory(targetDb),history,'Restored migration hashes differ')
  console.log('PASS restored exact row counts across '+Object.keys(before).length+' StayHub tables')
  console.log('PASS restored migration history and checksums (11/11)')

  const sourceConstraints=await sourceDb.query(`SELECT conrelid::regclass::text AS rel,conname,contype
    FROM pg_constraint WHERE connamespace='stayhub'::regnamespace ORDER BY 1,2`)
  const targetConstraints=await targetDb.query(`SELECT conrelid::regclass::text AS rel,conname,contype
    FROM pg_constraint WHERE connamespace='stayhub'::regnamespace ORDER BY 1,2`)
  assert.deepEqual(targetConstraints.rows,sourceConstraints.rows)
  assert.ok(sourceConstraints.rows.some(c=>c.contype==='f'),'FKs missing')
  console.log('PASS all restored database constraints and foreign keys')

  // A replay of the full restore must be non-destructive; no redeployment
  // executes against the actual destination during this CI rehearsal.
  const restoredAccount=await targetDb.query(
    "SELECT count(*)::integer AS n FROM stayhub.accounts WHERE email='p27-restorable@example.invalid'"
  )
  assert.equal(restoredAccount.rows[0].n,1)
  console.log('PASS recovered synthetic account data')
}finally{
  await sourceDb.end().catch(()=>{})
  await targetDb.end().catch(()=>{})
  rmSync(tmp,{recursive:true,force:true})
}
