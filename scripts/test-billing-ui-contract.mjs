import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const app=readFileSync('app/cloud/billing/page.tsx','utf8')
const owner=readFileSync('app/cloud/page.tsx','utf8')
const tenant=readFileSync('app/my/page.tsx','utf8')
assert.match(owner,/href="\/cloud\/billing"/)
assert.match(tenant,/href="\/cloud\/billing"/)
for(const endpoint of ['/api/v2/bills','/api/v2/meter-readings','/api/v2/leases'])assert.ok(app.includes(endpoint),endpoint)
assert.match(app,/Idempotency-Key/)
assert.match(app,/stableKey\(billReplay/)
assert.match(app,/stableKey\(paymentReplay/)
assert.match(app,/role\)\)/)
assert.match(app,/ประวัติบิลที่พัก/)
assert.match(app,/บิลของฉัน/)
for(const path of ['app/cloud/page.tsx','app/cloud/billing/page.tsx','app/my/page.tsx']){
  const result=ts.transpileModule(readFileSync(path,'utf8'),{fileName:path,reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}})
  assert.deepEqual(result.diagnostics?.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')),[],path)
}
console.log('Cloud Billing owner/tenant navigation, API wiring, replay keys and TSX syntax passed; HTTP integration not run')
