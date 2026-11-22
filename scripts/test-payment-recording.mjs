import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {cents,paymentBalance} from '../lib/db/billing-calculation.ts'

const first=paymentBalance('4000.00','1500.00')
assert.deepEqual(first,{paid:'1500.00',outstanding:'2500.00'})
const complete=paymentBalance('4000.00','4000.00')
assert.deepEqual(complete,{paid:'4000.00',outstanding:'0.00'})
assert.throws(()=>paymentBalance('4000.00','4000.01'),/Invalid bill balance/)
assert.equal(cents('0.00'),0)
assert.equal(cents('0.001'),null)

const route=readFileSync('app/api/v2/bills/[billId]/payments/route.ts','utf8')
const schema=readFileSync('db/migrations/010_billing_identity.sql','utf8')
for(const condition of [
  'canManageProperty(client,account.id,propertyId)',
  'WHERE property_id=$1 AND id=$2 FOR UPDATE',
  'old.bill_id!==billId||old.method!==method||old.amount!==amount',
  "bill.status==='paid'||bill.status==='void'",
  'current+amountCents>total',
  'bill.rows[0].account_id!==account.id',
  'WHERE property_id=$1 AND bill_id=$2',
  'Idempotency',
]){
  if(condition==='Idempotency')assert.ok(route.includes('idempotency-key'))
  else assert.ok(route.includes(condition),condition)
}
assert.match(schema,/CONSTRAINT billing_payment_idempotency UNIQUE\(property_id,idempotency_key\)/)
assert.match(schema,/CONSTRAINT billing_payment_bill_scope FOREIGN KEY\(property_id,bill_id\)/)
assert.match(schema,/billing_payments_immutable BEFORE UPDATE OR DELETE/)
assert.match(schema,/billing_payment_insert_guard BEFORE INSERT/)
assert.match(schema,/paid\+NEW.amount>b.total/)
console.log('Payment arithmetic and static concurrency/authorization contracts passed; database integration not run.')
