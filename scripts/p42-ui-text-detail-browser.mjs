#!/usr/bin/env node
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {chromium} from 'playwright'
const base=process.env.P26_E2E_BASE,raw=process.env.DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||!raw||new URL(raw).hostname!=='127.0.0.1'||new URL(raw).pathname!=='/stayhub_p26_ci')throw Error('Isolated localhost test only')
const browser=await chromium.launch({headless:true,executablePath:process.env.STAYHUB_CHROMIUM_PATH||'/usr/bin/chromium'})
const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844},isMobile:true,hasTouch:true})
const post=async(path,data)=>{const r=await ctx.request.post(path,{data,headers:{origin:base}});assert.equal(r.status(),201,`${path}: ${await r.text()}`);return r.json()}
const prohibited=/PostgreSQL|Neon|Railway|Database|Migration|Staging|\bAPI\b|\bServer\b|\bDraft\b|\bRestore\b|Request failed|Operation failed|Report unavailable|Bill list unavailable/i
try{
 const tag=randomBytes(5).toString('hex')
 await post('/api/v2/register',{email:`p42-owner-${tag}@example.invalid`,password:'CI-p42-123456'})
 const property=(await post('/api/v2/property',{name:'P42 Apartment',type:'apartment'})).id
 const unit=(await post('/api/v2/unit',{propertyId:property,name:'A101'})).id
 const page=await ctx.newPage()
 for(const path of ['/cloud/rooms',`/cloud/leases?unitId=${unit}`,'/cloud/billing','/cloud/operations?kind=settings','/cloud/repairs','/cloud/reports','/cloud/receipts','/membership','/workspace','/workspace/backup']){
  await page.goto(path)
  await page.locator('h1').first().waitFor()
  const visible=await page.locator('body').innerText()
  assert.doesNotMatch(visible,prohibited,path)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${path}: mobile overflow`)
  console.log(`PASS ${path}: mobile text`)
 }
 await page.route('**/api/v2/bills?*',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Bill list unavailable'})}))
 await page.goto('/cloud/receipts')
 await page.getByRole('alert').first().waitFor()
 const alert=await page.getByRole('alert').first().innerText()
 assert.match(alert,/โหลดรายการบิลไม่สำเร็จ/)
 assert.doesNotMatch(alert,prohibited)
 console.log('PASS English API error displays Thai on receipts page')
}finally{await ctx.close();await browser.close()}
