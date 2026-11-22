import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const root=fileURLToPath(new URL('../',import.meta.url))
const script='scripts/migrate-production.mjs'
const source=readFileSync(new URL(script,`file://${root}`),'utf8')
const app=readFileSync(new URL('lib/db/postgres.ts',`file://${root}`),'utf8')
const transport=readFileSync(new URL('app/api/health/db/transport/route.ts',`file://${root}`),'utf8')
const base={...process.env,RAILWAY_PROJECT_ID:'a8a5a434-4d18-438f-b4ea-ece072094595',
  RAILWAY_ENVIRONMENT_ID:'c9c4b13a-9041-4ae6-bd50-2d02b546b053',
  RAILWAY_ENVIRONMENT_NAME:'production',STAYHUB_DB_PROVIDER:'neon-production',
  STAYHUB_NEON_PRODUCTION_HOST:'ep-approved.neon.tech',
  DATABASE_URL:'postgresql://fixture:fixture@ep-approved.neon.tech/neondb?sslmode=disable'}
const run=override=>spawnSync(process.execPath,[script,'--dry-run'],
  {cwd:root,env:{...base,...override},encoding:'utf8'})
const good=run({})
assert.equal(good.status,0,good.stderr)
assert.match(good.stdout,/011_bill_issue_idempotency.sql/)
for(const bad of [
  {STAYHUB_NEON_PRODUCTION_HOST:'ep-other.neon.tech'},
  {DATABASE_URL:'postgresql://fixture:fixture@ep-other.neon.tech/neondb'},
  {DATABASE_URL:'postgresql://fixture:fixture@ep-approved.neon.tech/railway'},
  {RAILWAY_ENVIRONMENT_NAME:'staging'},
])assert.notEqual(run(bad).status,0,`unsafe preflight unexpectedly passed: ${Object.keys(bad)}`)
assert.match(source,/Neon production migration history verified; no migration executed/)
assert.match(source,/applied\.length!==migrations\.length/)
assert.match(source,/client\.connection\.stream\.authorized!==true/)
assert.match(app,/usingNeonProduction/)
assert.match(app,/url\.searchParams\.set\('sslmode', 'verify-full'\)/)
assert.match(transport,/STAYHUB_DB_PROVIDER === 'neon-production'/)
assert.match(transport,/stream\.authorized === true/)
console.log('PASS Neon production cutover preflight guards (dry-run only)')
