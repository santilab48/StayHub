import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {meterCharge,thousandths,cents,formatCents} from '../lib/db/billing-calculation.ts'

assert.deepEqual(meterCharge('127.250','130.500','8.50'),{usage:3250,amount:2763})
assert.deepEqual(meterCharge('0','10','7.25'),{usage:10000,amount:7250})
assert.deepEqual(meterCharge('1234.500','1234.500','9.00'),{usage:0,amount:0})
assert.equal(meterCharge('30','29','9.00'),null,'decreasing meter rejected')
assert.equal(meterCharge('30.001','30','9.00'),null)
assert.equal(thousandths('0.000'),0)
assert.equal(thousandths('1.0001'),null)
assert.equal(cents('9.999'),null)
assert.equal(formatCents(2763),'27.63')

const meter=readFileSync('app/api/v2/meter-readings/route.ts','utf8')
const bill=readFileSync('app/api/v2/bills/route.ts','utf8')
const schema=readFileSync('db/migrations/010_billing_identity.sql','utf8')
const migration=readFileSync('db/migrations/011_bill_issue_idempotency.sql','utf8')
for(const token of ['canManageProperty(client,account.id,propertyId)','SELECT id FROM stayhub.units WHERE property_id=$1 AND id=$2 FOR UPDATE',
  'initial_reading_required','duplicate_reading','later_reading_exists','period<$4::date'])assert.ok(meter.includes(token),token)
for(const token of ['lockedBillingIdentity(client,propertyId,leaseId)','exclusiveMonthlyStay(client,identity,period)',
  'canManageProperty(client,account.id,propertyId)','idempotency_conflict','duplicate_month',
  'identity.accountId,identity.unitId,identity.stayId','formatCents(total)','SET finalized=true',
  'billHistoryArgs(filter,manage,account.id)'])assert.ok(bill.includes(token),token)
assert.ok(schema.includes('billing_item_meter_once UNIQUE(meter_reading_id)'))
assert.ok(schema.includes('Meter allocation requires exactly one stay in period'))
assert.ok(migration.includes('billing_issue_idempotency'))
assert.ok(migration.includes('billing_issue_identity_immutable'))
console.log('P2.5-C calculation scenarios and static binding contracts passed; PostgreSQL integration not run.')
