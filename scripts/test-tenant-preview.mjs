#!/usr/bin/env node
import assert from 'node:assert/strict'
import {chromium} from 'playwright'

if(process.env.TENANT_PREVIEW_BASE!=='http://127.0.0.1:3000')throw Error('Local tenant preview test only')
const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
try{
 const page=await browser.newPage()
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 for(const width of [360,390,768,1280,1920]){
  await page.setViewportSize({width,height:850})
  await page.goto('http://127.0.0.1:3000/preview/tenant')
  await page.getByText('ตัวอย่างหน้าผู้เช่า').waitFor()
  const tabs=page.getByRole('navigation',{name:'เมนูผู้เช่า'}).getByRole('button')
  assert.equal(await tabs.count(),6,`${width}: six tenant tabs`)
  for(const label of ['บิลของฉัน','แจ้งซ่อม','พัสดุ','ประกาศ','รถของห้อง','เอกสาร']){
   await tabs.getByText(label,{exact:true}).click()
   assert.equal(await page.locator('button[aria-current="page"]').textContent(),label)
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${width}: no horizontal overflow`)
  assert.match(await page.locator('main').evaluate(el=>getComputedStyle(el).backgroundColor+' '+getComputedStyle(el).backgroundImage),/11, 16, 30|#0b101e/)
  if(width===390)await page.screenshot({path:'/tmp/stayhub-tenant-preview-mobile.png',fullPage:true})
  if(width===1280)await page.screenshot({path:'/tmp/stayhub-tenant-preview-desktop.png',fullPage:true})
 }
 for(const path of ['billing','news','repair','room','services']){
  await page.goto('http://127.0.0.1:3000/tenant/'+path)
  await page.waitForURL('http://127.0.0.1:3000/my')
 }
 assert.deepEqual(errors,[])
 console.log('PASS tenant preview: six tabs, five widths, no overflow, legacy routes redirect')
}finally{await browser.close()}
