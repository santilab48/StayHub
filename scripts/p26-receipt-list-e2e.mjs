#!/usr/bin/env node
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import pg from 'pg'
import {chromium} from 'playwright'

const base=process.env.P26_E2E_BASE,db=process.env.DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||!db||new URL(db).hostname!=='127.0.0.1'||new URL(db).pathname!=='/stayhub_p26_ci')throw Error('Isolated CI only')
const tag=randomBytes(5).toString('hex'),sql=new pg.Client({connectionString:db})
async function call(path,cookie,body,headers={}){
 const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(cookie?{cookie}:{}),...(body?{'content-type':'application/json',origin:base}:{}),...headers},body:body?JSON.stringify(body):undefined})
 const value=await r.json();return {status:r.status,value,cookie:r.headers.get('set-cookie')?.split(';')[0]}
}
const expect=(r,status,label)=>{assert.equal(r.status,status,`${label}: ${JSON.stringify(r.value)}`);return r.value}
try{
 await sql.connect()
 const missing=(await sql.query("SELECT to_regclass('stayhub.tenant_contract_access') AS relation")).rows[0].relation===null
 const owner=await call('/api/v2/register',null,{email:`receipt-${tag}@example.invalid`,password:'CI-receipt-123456'})
 expect(owner,201,'owner');const cookie=owner.cookie
 const propertyId=expect(await call('/api/v2/property',cookie,{name:'CI Receipt '+tag,type:'apartment'}),201,'property').id
 const unitId=expect(await call('/api/v2/unit',cookie,{propertyId,name:'A101'}),201,'unit').id
 const date=new Date(Date.now()+7*3600000).toISOString().slice(0,7)+'-01'
 const ends=String(Number(date.slice(0,4))+1)+date.slice(4)
 const contract=expect(await call('/api/v2/room-contracts',cookie,{unitId,signedAt:date,startsOn:date,endsOn:ends,landlord:'Owner',landlordAddress:'Address',landlordPhone:'',tenant:'Tenant',tenantAddress:'Address',tenantPhone:'',propertyAddress:'Property',rent:'1000',deposit:'0',advance:'0',water:'0',electric:'0',service:'0',dueDay:'5',inventory:'',terms:''}),201,'contract')
 const bill=expect(await call('/api/v2/bills',cookie,{propertyId,roomContractId:contract.id,period:date.slice(0,7)},{'idempotency-key':'receipt-bill-'+tag}),201,'bill')
 const listPath='/api/v2/bills?propertyId='+propertyId+'&status=paid&limit=50&page=1'
 assert.equal(expect(await call(listPath,cookie),200,'unpaid filtered').items.length,0)
 expect(await call('/api/v2/bills/'+bill.id+'/payments',cookie,{propertyId,amount:'400.00',method:'cash'},{'idempotency-key':'receipt-pay-1-'+tag}),201,'partial payment')
 assert.equal(expect(await call(listPath,cookie),200,'partial filtered').items.length,0)
 expect(await call('/api/v2/bills/'+bill.id+'/payments',cookie,{propertyId,amount:'600.00',method:'cash'},{'idempotency-key':'receipt-pay-2-'+tag}),201,'final payment')
 const paid=expect(await call(listPath,cookie),200,'paid list').items
 assert.equal(paid.length,1);assert.equal(paid[0].id,bill.id);assert.equal(paid[0].outstanding,'0.00')
 const sum=expect(await call('/api/v2/bills/summary?propertyId='+propertyId,cookie),200,'owner summary')
 assert.equal(sum.paidTotal,'1000.00')
 const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
 try{
  const context=await browser.newContext({baseURL:base})
  await context.addCookies([{name:cookie.split('=')[0],value:cookie.split('=').slice(1).join('='),url:base}])
  const page=await context.newPage()
  await page.goto('/cloud/receipts')
  const receiptLink=page.getByRole('link',{name:'ดูใบเสร็จ',exact:true})
  await receiptLink.waitFor()
  assert.equal(await receiptLink.getAttribute('href'),'/cloud/receipts/'+encodeURIComponent(bill.id)+'?propertyId='+encodeURIComponent(propertyId))
  assert.equal(await page.locator('main').getByRole('alert').count(),0,'Receipt list must have no application error')
  assert.equal(await page.getByText('ไม่มีใบเสร็จในหน้านี้').count(),0)
  await receiptLink.click()
  await page.getByRole('button',{name:'พิมพ์ใบเสร็จ',exact:true}).waitFor()
  assert.equal(await page.locator('main').getByRole('alert').count(),0,'Receipt page must have no application error')
  await page.locator('#stayhub-receipt-document').getByText('A101',{exact:true}).waitFor()
  assert.equal(await page.locator('#stayhub-receipt-document').getByText('1,000.00 บาท',{exact:true}).count()>0,true)
 }finally{await browser.close()}
 console.log('PASS owner receipt list with '+(missing?'18':'19')+' migrations: unpaid/partial hidden, paid balance from PostgreSQL shown in Chromium')
}finally{await sql.end()}
