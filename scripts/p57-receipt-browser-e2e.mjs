#!/usr/bin/env node
// P5.7: browser-print PDF of a paid receipt on disposable localhost PostgreSQL.
// No production writes or external API calls.
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdirSync,writeFileSync} from 'node:fs'
import {chromium} from 'playwright'
import {PDFDocument} from 'pdf-lib'

const base=process.env.P26_E2E_BASE
const db=process.env.DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||
    !db||new URL(db).hostname!=='127.0.0.1'||
    new URL(db).pathname!=='/stayhub_p26_ci')
  throw new Error('REFUSED: receipt/browser PDF audit requires isolated localhost CI database')

const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
const owner=await browser.newContext({baseURL:base,serviceWorkers:'block'})
const tenant=await browser.newContext({baseURL:base,serviceWorkers:'block'})
const other=await browser.newContext({baseURL:base,serviceWorkers:'block'})
const unique=randomBytes(8).toString('hex')
const pwd='P57-ci-disposable-Only-1234!'

async function post(ctx,path,body,expected=201,headers={}){
  const response=await ctx.request.post(path,{data:body,headers:{origin:base,...headers}})
  const json=await response.json().catch(()=>null)
  assert.equal(response.status(),expected,`${path} expected ${expected}, got ${response.status()} ${JSON.stringify(json)}`)
  return json
}
async function register(ctx,label){
  await post(ctx,'/api/v2/register',{email:`p57-${label}-${unique}@example.invalid`,password:pwd})
}
try {
  await register(owner,'owner')
  await register(other,'other')
  const prop=(await post(owner,'/api/v2/property',{name:'CI Receipt '+unique,type:'apartment'})).id
  const unit=(await post(owner,'/api/v2/unit',{propertyId:prop,name:'CI-Receipt-101'})).id
  const invite=await post(owner,'/api/v2/create-invite',{propertyId:prop,unitId:unit})
  const token=new URL(invite.url).searchParams.get('token')
  assert.ok(token)
  await post(tenant,'/api/v2/tenant-device',{token,roomNumber:'CI-Receipt-101'})
  const requests=await owner.request.get('/api/v2/requests?propertyId='+prop)
  assert.equal(requests.status(),200)
  const pending=(await requests.json()).items.find(x=>x.status==='pending')
  assert.ok(pending?.id)
  await post(owner,'/api/v2/approve',{propertyId:prop,requestId:pending.id,unitId:unit},200)
  const stays=await tenant.request.get('/api/v2/my-stays?tenant=1')
  assert.equal(stays.status(),200)
  const stayId=(await stays.json()).items.find(x=>x.unit_name==='CI-Receipt-101')?.id
  assert.ok(stayId)
  const lease=(await post(owner,'/api/v2/leases',{
    action:'create',propertyId:prop,stayId,startsOn:'2026-11-01',
    monthlyRent:4000,securityDeposit:0,
  })).id
  const bill=await post(owner,'/api/v2/bills',{
    propertyId:prop,leaseId:lease,period:'2026-11',otherAmount:'0.00',
  },201,{'idempotency-key':'p57-bill-'+unique})
  const billId=bill.id
  assert.equal(bill.total,'4000.00')
  const route=`/cloud/receipts/${billId}?propertyId=${prop}`
  const page=await owner.newPage()
  page.setDefaultTimeout(15000)
  await page.goto(route)
  await page.getByRole('heading',{name:'ยังไม่สามารถออกใบเสร็จได้'}).waitFor()
  assert.equal(await page.getByRole('button',{name:'พิมพ์ใบเสร็จ'}).count(),0)
  console.log('PASS unpaid bill has no printable receipt')

  await post(owner,`/api/v2/bills/${billId}/payments`,{
    propertyId:prop,amount:'1500.00',method:'cash',
  },201,{'idempotency-key':'p57-partial-'+unique})
  await page.reload()
  await page.getByRole('heading',{name:'ยังไม่สามารถออกใบเสร็จได้'}).waitFor()
  assert.equal(await page.getByRole('button',{name:'พิมพ์ใบเสร็จ'}).count(),0)
  console.log('PASS partially paid bill has no printable receipt')

  await post(owner,`/api/v2/bills/${billId}/payments`,{
    propertyId:prop,amount:'2500.00',method:'transfer',
  },201,{'idempotency-key':'p57-final-'+unique})
  await page.reload()
  await page.getByRole('heading',{name:'ใบรับชำระเงิน'}).waitFor()
  await page.getByText('4,000.00 บาท',{exact:false}).first().waitFor()
  await page.getByRole('button',{name:'พิมพ์ใบเสร็จ'}).waitFor()
  mkdirSync('docs/print-samples/p43',{recursive:true})
  await page.emulateMedia({media:'print'})
  assert.equal(await page.locator('.receiptPrintPage header').evaluate(e=>getComputedStyle(e).display),'none')
  assert.equal(await page.locator('.noPrint').evaluate(e=>getComputedStyle(e).display),'none')
  for(const paper of ['A4','A5','80mm','58mm']){
   const bytes=await page.pdf({...(paper.endsWith('mm')?{width:paper,height:'150mm'}:{format:paper}),margin:{top:'4mm',bottom:'4mm',left:'4mm',right:'4mm'},printBackground:true})
   assert.ok(bytes.length>3000,'PDF must contain rendered receipt')
   const document=await PDFDocument.load(bytes)
   assert.ok(document.getPageCount()>=1,'Chromium PDF must contain at least one page')
   assert.equal(await page.locator('#stayhub-receipt-document').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,`${paper}: receipt overflow`)
   if(paper==='A4')writeFileSync('docs/print-samples/p43/apartment-A4.pdf',bytes)
   console.log(`PASS apartment owner receipt ${paper}: ${bytes.length} bytes, ${document.getPageCount()} page(s)`)
  }
  await page.emulateMedia({media:'screen'})
  await page.evaluate(()=>{window.__p43PrintCalls=0;window.print=()=>{window.__p43PrintCalls++}})
  await page.getByRole('button',{name:'พิมพ์ใบเสร็จ'}).click()
  assert.equal(await page.evaluate(()=>window.__p43PrintCalls),1)

  const guestPage=await other.newPage()
  guestPage.setDefaultTimeout(15000)
  await guestPage.goto(route)
  await guestPage.getByRole('alert').filter({hasText:/ไม่พบข้อมูล|ไม่พบสิทธิ์|ตรวจสอบบิลไม่สำเร็จ/}).waitFor()
  assert.equal(await guestPage.getByRole('heading',{name:'ใบรับชำระเงิน'}).count(),0)
  console.log('PASS unrelated account cannot view or print another tenant receipt')

  const tenantPage=await tenant.newPage()
  tenantPage.setDefaultTimeout(15000)
  await tenantPage.goto(`/my/receipt/${billId}?propertyId=${prop}&unitId=${unit}`)
  await tenantPage.getByRole('heading',{name:'ใบรับชำระเงิน'}).waitFor()
  await tenantPage.emulateMedia({media:'print'})
  assert.equal(await tenantPage.locator('.receiptPrintPage nav').evaluate(e=>getComputedStyle(e).display),'none')
  for(const paper of ['A4','A5','80mm','58mm']){
   const bytes=await tenantPage.pdf({...(paper.endsWith('mm')?{width:paper,height:'150mm'}:{format:paper}),margin:{top:'4mm',bottom:'4mm',left:'4mm',right:'4mm'},printBackground:true})
   const document=await PDFDocument.load(bytes)
   assert.ok(document.getPageCount()>=1)
   console.log(`PASS apartment tenant receipt ${paper}: ${document.getPageCount()} page(s)`)
  }
  await tenantPage.emulateMedia({media:'screen'})
  await tenantPage.evaluate(()=>{window.__p43PrintCalls=0;window.print=()=>{window.__p43PrintCalls++}})
  await tenantPage.getByRole('button',{name:'พิมพ์ใบเสร็จ'}).click()
  assert.equal(await tenantPage.evaluate(()=>window.__p43PrintCalls),1)
  console.log('PASS approved tenant can view and print settled receipt')
  console.log('PASS P5.7 isolated Chromium paid receipt PDF E2E')
} finally {
  await Promise.allSettled([owner.close(),tenant.close(),other.close()])
  await browser.close()
}
