#!/usr/bin/env node
// P2.6 CI-only bootstrap. Refuses all nonlocal database endpoints.
import {readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import pg from 'pg'

const raw=process.env.DATABASE_URL
if(!raw)throw new Error('P2.6 CI DATABASE_URL required')
const url=new URL(raw)
if(!['127.0.0.1','localhost','::1'].includes(url.hostname)||url.pathname!=='/stayhub_p26_ci')
  throw new Error('REFUSED: P2.6 CI migrations require local stayhub_p26_ci only')
if(process.env.CI!=='true')throw new Error('REFUSED: CI only')
const client=new pg.Client({connectionString:raw,connectionTimeoutMillis:5000})
await client.connect()
try{
  await client.query('BEGIN')
  await client.query('CREATE SCHEMA IF NOT EXISTS stayhub')
  await client.query(`CREATE TABLE IF NOT EXISTS stayhub.schema_migrations
    (filename text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`)
  const files=readdirSync('db/migrations').filter(x=>/^\d{3}_[\w-]+\.sql$/.test(x)).sort()
  if(files.length!==14)throw new Error('Expected exactly 14 reviewed migrations; found '+files.length)
  for(const name of files){
    const sql=readFileSync(join('db/migrations',name),'utf8')
    await client.query(sql)
    const checksum=createHash('sha256').update(sql).digest('hex')
    await client.query('INSERT INTO stayhub.schema_migrations(filename,checksum) VALUES($1,$2)',[name,checksum])
    console.log('APPLIED_TEST',name)
  }
  await client.query('COMMIT')
  const count=await client.query('SELECT count(*)::integer AS n FROM stayhub.schema_migrations')
  if(count.rows[0].n!==14)throw new Error('Migration history incomplete')
  console.log('CI database migration history: 14/14')
}catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
finally{await client.end()}
