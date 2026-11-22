import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const sql=readFileSync(new URL('../db/migrations/010_billing_identity.sql',import.meta.url),'utf8')
const helper=readFileSync(new URL('../lib/db/billing-identity.ts',import.meta.url),'utf8')
const checks={
  'Account A cannot attach Account B stay':/FOREIGN KEY\(property_id,lease_id,stay_id,account_id,unit_id\)[\s\S]*REFERENCES stayhub\.leases\(property_id,id,stay_id,account_id,unit_id\)/,
  'Property A cannot attach Property B unit':/FOREIGN KEY\(property_id,unit_id\) REFERENCES stayhub\.units\(property_id,id\)/,
  'Meter separated by month and unique':/UNIQUE\(property_id,unit_id,meter_type,period\)/,
  'Monthly bill unique to lease':/UNIQUE\(property_id,lease_id,period,bill_type\)/,
  'Payment property scoped to bill':/FOREIGN KEY\(property_id,bill_id\)[\s\S]*REFERENCES stayhub\.billing_bills\(property_id,id\)/,
  'Meter item cross type and period guarded':/FOREIGN KEY\(property_id,meter_reading_id,unit_id,fee_code,period\)[\s\S]*REFERENCES stayhub\.billing_meter_readings\(property_id,id,unit_id,meter_type,period\)/,
  'Nonnegative money and readings':/CHECK\(amount>0\)/,
  'Bill items immutable':/billing_items_immutable BEFORE UPDATE OR DELETE/,
  'Billed meters immutable':/billing_meter_billed_immutable BEFORE UPDATE OR DELETE/,
  'Payment snapshots immutable':/billing_payments_immutable BEFORE UPDATE OR DELETE/,
  'Concurrent payment locked':/FROM stayhub\.billing_bills WHERE id=NEW.bill_id FOR UPDATE/,
  'Month utility occupant guard':/Meter allocation requires exactly one stay in period/,
  'Lease validity guarded':/Bill outside active lease\/stay dates/,
  'Finalized total verified':/billing_total_at_commit[\s\S]*DEFERRABLE INITIALLY DEFERRED/,
}
for(const [name,pattern] of Object.entries(checks)){
  assert.match(sql,pattern,name)
  console.log(`PASS static: ${name}`)
}
assert.match(helper,/FOR UPDATE OF l,s/)
assert.match(helper,/r\.rows\.length===1&&r\.rows\[0\]\.stay_id===identity\.stayId/)
console.log('PASS static: server-side lease and exclusive stay lookups')
