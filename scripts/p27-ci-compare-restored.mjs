#!/usr/bin/env node
/**
 * P2.7-C — compare two restored PostgreSQL datasets WITHOUT printing user data.
 * CI rehearsal only: exact disposable localhost source and target databases.
 * Production comparison requires a separately authorized implementation.
 */
import assert from 'node:assert/strict'
import pg from 'pg'

const SOURCE='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_p26_ci'
const TARGET='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_p27_restore'
if(process.env.CI!=='true' || process.env.P27_DISPOSABLE_RESTORE!=='YES' ||
   process.env.DATABASE_URL!==SOURCE || process.env.P27_RESTORE_TARGET_URL!==TARGET)
  throw new Error('REFUSED: compare permitted only for the two disposable CI databases')

async function inspect(url) {
 const db=new pg.Client({connectionString:url,connectionTimeoutMillis:10000,application_name:'stayhub-p27-ci-compare'})
 await db.connect()
 let begun=false
 try{
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  begun=true
  await db.query("SET LOCAL statement_timeout='15s'")
  const tables=(await db.query(`SELECT table_name FROM information_schema.tables
   WHERE table_schema='stayhub' AND table_type='BASE TABLE'
   ORDER BY table_name`)).rows.map(x=>x.table_name)
  if(tables.length!==20||!tables.includes('schema_migrations'))
    throw new Error('Unexpected StayHub schema: expected exactly 20 tables')
  const rows={}
  for(const table of tables){
   assert.match(table,/^[a-z_]+$/)
   rows[table]=(await db.query(`SELECT COUNT(*)::bigint AS n FROM stayhub."${table}"`)).rows[0].n
  }
  const history=(await db.query(
   'SELECT filename,checksum FROM stayhub.schema_migrations ORDER BY filename'
  )).rows
  if(history.length!==11)throw new Error('Expected 11 migration records')
  const extensions=(await db.query(
   "SELECT extname,extversion FROM pg_extension ORDER BY extname"
  )).rows
  const constraints=(await db.query(`SELECT c.conrelid::regclass::text AS table_name,
   c.conname AS name,c.contype AS type,pg_get_constraintdef(c.oid) AS definition
   FROM pg_constraint c WHERE c.connamespace='stayhub'::regnamespace
   ORDER BY 1,2`)).rows
  const indexes=(await db.query(`SELECT tablename,indexname,indexdef FROM pg_indexes
    WHERE schemaname='stayhub' ORDER BY tablename,indexname`)).rows
  const payments=(await db.query(`SELECT count(*)::bigint AS n,
    coalesce(sum(amount),0)::numeric::text AS amount
    FROM stayhub.billing_payments`)).rows[0]
  const bills=(await db.query(`SELECT count(*)::bigint AS n,
    coalesce(sum(total),0)::numeric::text AS amount,
    count(*) FILTER(WHERE status='paid')::bigint AS paid
    FROM stayhub.billing_bills`)).rows[0]
  await db.query('COMMIT')
  begun=false
  return {tables,rows,history,extensions,constraints,indexes,payments,bills}
 }finally{
  if(begun)await db.query('ROLLBACK').catch(()=>{})
  await db.end().catch(()=>{})
 }
}
const left=await inspect(SOURCE)
const right=await inspect(TARGET)
const categories=['tables','rows','history','extensions','constraints','indexes','payments','bills']
const failed=categories.filter(k=>JSON.stringify(left[k])!==JSON.stringify(right[k]))
for(const key of categories)
 console.log((failed.includes(key)?'FAIL ':'PASS ')+key+' dataset comparison')
if(failed.length){
 console.error('REFUSED: restored database is not identical in categories: '+failed.join(', '))
 process.exitCode=1
}else{
 console.log('PASS complete CI restore dataset comparison, all '+left.tables.length+' tables and finance totals match')
}
