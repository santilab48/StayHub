import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const middleware = read('middleware.ts')
const db = read('lib/db/postgres.ts')
const probe = read('app/api/health/db/freeze/route.ts')

assert.match(middleware, /STAYHUB_WRITE_FREEZE !== 'YES'/)
assert.match(middleware, /path\.startsWith\('\/api\/'\)/)
assert.match(middleware, /status: 503/)
assert.match(middleware, /path === '\/api\/health\/db\/freeze'/)
assert.match(middleware, /'Cache-Control': 'no-store'/)
assert.doesNotMatch(db, /Neon production connection requires verified maintenance write freeze/)
assert.match(db, /options: writeFreeze \? '-c default_transaction_read_only=on' : undefined/)
assert.match(probe, /SHOW default_transaction_read_only/)
assert.match(probe, /status: readOnly \? 200 : 503/)
console.log('PASS static maintenance gate and read-only pool configuration contracts')
console.log('NOT TESTED live middleware responses, database read-only or Production write freeze')
