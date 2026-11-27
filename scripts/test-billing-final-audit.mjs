import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const file = path => readFileSync(path,'utf8')
const sql=file('db/migrations/010_billing_identity.sql')
const guard=sql.match(/CREATE FUNCTION stayhub\.billing_guard_meter_update\(\).*?END \$\$;/s)?.[0]
assert.ok(guard, 'meter guard must exist')
assert.match(guard,/IF TG_OP='UPDATE' THEN RETURN NEW; END IF;/,
  'unbilled meter UPDATE must not be silently discarded')
assert.match(guard,/billing_bill_items WHERE meter_reading_id=OLD.id/,
  'billed readings must remain immutable')
assert.match(sql,/CREATE CONSTRAINT TRIGGER billing_total_at_commit[\s\S]*?DEFERRABLE INITIALLY DEFERRED/)
for (const f of [
  'app/api/v2/meter-readings/route.ts',
  'app/api/v2/bills/route.ts',
  'app/api/v2/bills/[billId]/route.ts',
  'app/api/v2/bills/[billId]/payments/route.ts',
  'app/api/v2/bills/summary/route.ts',
]) {
  const route=file(f)
  assert.match(route,/accountFromSession\(/,`${f}: server session required`)
  assert.match(route,/Cache-Control':\s*'no-store'/,`${f}: avoid shared caches`)
}
const payment=file('app/api/v2/bills/[billId]/payments/route.ts')
assert.match(payment,/FOR UPDATE/)
assert.match(payment,/idempotency_conflict/)
assert.match(payment,/payment_exceeds_bill/)
const history=file('lib/db/billing-history.ts')
assert.match(history,/b\.account_id=\$6::uuid/)
console.log('P2.5-F source audit contracts passed (not PostgreSQL or HTTP integration).')
