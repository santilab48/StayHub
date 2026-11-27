import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.P2B_TEST_DATABASE_URL })
const identity = await pool.query("SELECT current_database() database, inet_server_addr() address")
assert.equal(identity.rows[0].database, 'stayhub_p2b')
const accountId = randomUUID(), otherId = randomUUID(), propertyId = randomUUID(), foreignProperty = randomUUID()
const token = randomBytes(32).toString('base64url')
const hash = createHash('sha256').update(token).digest('hex')
try {
  await pool.query('INSERT INTO stayhub.accounts(id,email) VALUES($1,$3),($2,$4)', [accountId, otherId, `${accountId}@example.invalid`, `${otherId}@example.invalid`])
  await pool.query("INSERT INTO stayhub.properties(id,owner_account_id,name,property_type) VALUES($1,$3,'Test','apartment'),($2,$4,'Foreign','apartment')", [propertyId, foreignProperty, accountId, otherId])
  await pool.query("INSERT INTO stayhub.property_memberships(property_id,account_id,role) VALUES($1,$2,'owner')", [propertyId, accountId])
  await pool.query("INSERT INTO stayhub.sessions(account_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')", [accountId, hash])
  const headers = { 'Content-Type': 'application/json', Cookie: `stayhub_session=${token}`, Origin: 'http://127.0.0.1:3101' }
  const available = await fetch('http://127.0.0.1:3101/api/v2/sync/properties', { headers })
  assert.equal(available.status, 200)
  const properties = await available.json()
  assert.equal(properties.accountId, accountId)
  assert.deepEqual(properties.properties.map(property => property.id), [propertyId])
  const localId = randomUUID()
  assert.notEqual(localId, propertyId)
  const unitId = randomUUID(), operationId = randomUUID()
  const post = async body => {
    const result = await fetch('http://127.0.0.1:3101/api/v2/sync', { method: 'POST', headers, body: JSON.stringify(body) })
    return { status: result.status, body: await result.json() }
  }
  const body = { operationId, propertyId, entityType: 'units', entityId: unitId, action: 'upsert', baseRevision: 0, payload: { name: '101' } }
  assert.equal((await post({ ...body, propertyId: localId })).status, 403)
  assert.equal((await post({ ...body, propertyId: foreignProperty })).status, 403)
  assert.equal((await post(body)).body.result, 'accepted')
  assert.equal((await post(body)).body.result, 'duplicate')
  assert.equal((await post({ ...body, payload: { name: 'Tampered' } })).body.result, 'rejected')
  assert.equal((await post({ ...body, operationId: randomUUID(), payload: { name: 'Wrong' } })).body.result, 'conflict')
  const stored = await pool.query('SELECT name FROM stayhub.units WHERE id=$1 AND property_id=$2', [unitId, propertyId])
  assert.equal(stored.rows.length, 1)
  assert.equal(stored.rows[0].name, '101')
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM stayhub.local_sync_receipts WHERE entity_id=$1', [unitId])).rows[0].count, 2)
  console.log('P2-B PostgreSQL integration passed: mapping, membership, duplicate and revision conflict')
} finally {
  await pool.end()
}
