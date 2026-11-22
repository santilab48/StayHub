import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'

const scratch=mkdtempSync(join(tmpdir(),'stayhub-history-'))
try{
  for(const file of ['billing-request','billing-history']){
    const source=readFileSync(`lib/db/${file}.ts`,'utf8')
      .replace("from './billing-request'","from './billing-request.mjs'")
    writeFileSync(join(scratch,`${file}.mjs`),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText)
  }
  const {parseBillHistory,billScope}=await import(pathToFileURL(join(scratch,'billing-history.mjs')).href)
  const property='11111111-1111-4111-8111-111111111111'
  const unit='22222222-2222-4222-8222-222222222222'
  const valid=new URLSearchParams({propertyId:property,unitId:unit,period:'2026-11',status:'partial',page:'2',limit:'25'})
  assert.deepEqual(parseBillHistory(valid),{propertyId:property,unitId:unit,period:'2026-11-01',status:'partial',limit:25,offset:25})
  assert.equal(parseBillHistory(new URLSearchParams({page:'0'})),null)
  assert.equal(parseBillHistory(new URLSearchParams({limit:'51'})),null)
  assert.equal(parseBillHistory(new URLSearchParams({period:'2026-13'})),null)
  assert.equal(parseBillHistory(new URLSearchParams({status:'paid OR true'})),null)
  assert.equal(parseBillHistory(new URLSearchParams({unitId:'other-property'})),null)
  assert.match(billScope,/b\.account_id=\$6::uuid/)
  assert.match(billScope,/b\.finalized=true/)
  assert.ok(!billScope.includes('ends_at IS NULL'),'Historical bill visibility must not require active stays')
  const list=readFileSync('app/api/v2/bills/route.ts','utf8')
  const detail=readFileSync('app/api/v2/bills/[billId]/route.ts','utf8')
  const summary=readFileSync('app/api/v2/bills/summary/route.ts','utf8')
  const payments=readFileSync('app/api/v2/bills/[billId]/payments/route.ts','utf8')
  assert.ok(list.includes('canManageProperty(client,account.id,filter.propertyId)'))
  assert.ok(list.includes('LIMIT $7 OFFSET $8'))
  assert.ok(list.includes('b.stay_id'))
  assert.ok(detail.includes('bill.rows[0].account_id')||detail.includes('r.rows[0].account_id!==account.id'))
  assert.ok(detail.includes("if(!owner)return reply({bill,items:items.rows,...balance})"))
  assert.ok(summary.includes('canManageProperty(client,account.id,filter.propertyId!)'))
  assert.ok(summary.includes("status<>'void'"))
  assert.ok(payments.includes("if(!await canManageProperty(client,account.id,propertyId))return {error:'forbidden'}"))
  assert.ok(payments.includes('LIMIT $3 OFFSET $4'))
  console.log('Bill history filter/pagination cases and static account/property scopes passed; PostgreSQL integration not run.')
}finally{rmSync(scratch,{recursive:true,force:true})}
