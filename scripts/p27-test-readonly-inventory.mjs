#!/usr/bin/env node
/** P2.7 audit contract: disposable localhost PostgreSQL ONLY. No Railway access. */
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import pg from 'pg'

const url=process.env.P27_TEST_DATABASE_URL
if(process.env.CI!=='true'||!url||!/^(postgresql|postgres):\/\/postgres:postgres@127\.0\.0\.1:5432\/railway$/.test(url))
 throw new Error('REFUSED: disposable CI PostgreSQL only')
const db=new pg.Client({connectionString:url})
await db.connect()
try{
 await db.query(`CREATE SCHEMA stayhub;
 CREATE TABLE stayhub.schema_migrations(filename text PRIMARY KEY,checksum text NOT NULL);
 CREATE TABLE stayhub.accounts(id integer PRIMARY KEY,email text NOT NULL);
 CREATE TABLE stayhub.billing_bills(id integer PRIMARY KEY,total numeric(12,2),status text);
 CREATE TABLE stayhub.billing_payments(id integer PRIMARY KEY,amount numeric(12,2));
 INSERT INTO stayhub.schema_migrations VALUES('001_fake_ci.sql','fixture-checksum');
 INSERT INTO stayhub.accounts VALUES(1,'demo@example.invalid'),(2,'hidden@example.invalid');
 INSERT INTO stayhub.billing_bills VALUES(1,4350.00,'paid');
 INSERT INTO stayhub.billing_payments VALUES(1,1500.00),(2,2850.00);`)
 const env={
  ...process.env,
  DATABASE_URL:url,
  P27_READ_ONLY_AUDIT:'YES',
  RAILWAY_PROJECT_ID:'a8a5a434-4d18-438f-b4ea-ece072094595',
  RAILWAY_ENVIRONMENT_ID:'c9c4b13a-9041-4ae6-bd50-2d02b546b053',
  RAILWAY_ENVIRONMENT_NAME:'production',
  STAYHUB_DATABASE_ROLE:'production'
 }
 function run(vars){return spawnSync(process.execPath,['scripts/p27-readonly-inventory.mjs'],{
  env:{...env,...vars},encoding:'utf8',timeout:15000
 })}
 const good=run({})
 assert.equal(good.status,0,'Read-only inventory must run against disposable test database')
 const report=JSON.parse(good.stdout)
 assert.equal(report.database,'railway')
 assert.equal(report.tables,4)
 assert.equal(report.rowCounts.accounts,'2')
 assert.equal(report.rowCounts.schema_migrations,'1')
 assert.deepEqual(report.billingAggregates.bills,{rows:'1',total_amount:'4350.00',paid_rows:'1'})
 assert.deepEqual(report.billingAggregates.payments,{rows:'2',total_amount:'4350.00'})
 assert.ok(report.installedExtensions.some(x=>x.extname==='plpgsql'))
 assert.equal(report.migrations.length,1)
 assert.ok(!good.stdout.includes('demo@example.invalid'),'No user details leaked')
 console.log('PASS read-only inventory outputs exact table counts and migration history')
 console.log('PASS billing reconciliation totals and installed extensions (aggregate only)')
 const notEnabled=run({P27_READ_ONLY_AUDIT:'NO'})
 assert.notEqual(notEnabled.status,0)
 assert.match(notEnabled.stderr,/REFUSED/)
 console.log('PASS audit opt-in required')
 const wrongEnv=run({RAILWAY_ENVIRONMENT_ID:'wrong-environment'})
 assert.notEqual(wrongEnv.status,0)
 assert.match(wrongEnv.stderr,/REFUSED/)
 console.log('PASS audit rejects wrong environment')
 const wrongRole=run({STAYHUB_DATABASE_ROLE:'staging'})
 assert.notEqual(wrongRole.status,0)
 console.log('PASS audit rejects staging role')
 const still=await db.query('SELECT count(*)::int AS n FROM stayhub.accounts')
 assert.equal(still.rows[0].n,2)
 console.log('PASS fixture data unchanged after read-only audit')
}finally{await db.end()}
