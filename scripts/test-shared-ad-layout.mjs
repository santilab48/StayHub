#!/usr/bin/env node
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {chromium} from 'playwright'

const base=process.env.SHARED_AD_TEST_BASE
if(base!=='http://127.0.0.1:3000'||process.env.NEXT_PUBLIC_ENABLE_AD_MOCK!=='true')throw Error('Mock localhost only')
const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
const widths=[360,390,430,768,1280,1366,1440,1600,1920]
const paths=['/preview/guesthouse','/preview/daily','/preview/homestay']
try{
 const context=await browser.newContext({baseURL:base})
 const page=await context.newPage()
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 for(const path of paths){
  for(const width of widths){
   await page.setViewportSize({width,height:900})
   await page.goto(path)
   const layout=page.locator('[data-shared-ad-layout="mock"]')
   await layout.waitFor()
   const sides=page.locator('[data-ad-slot="content"], [data-ad-slot="push"]')
   assert.equal(await sides.count(),width>=1600?2:0,`${path} ${width}: side mount`)
   assert.equal(await page.locator('[data-ad-slot="bottom"]').count(),1)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${path} ${width}: horizontal overflow`)
   if(width===1920){
    const rect=await layout.evaluate(el=>{const x=el.getBoundingClientRect();const m=el.querySelector('[class*=main]')?.getBoundingClientRect();return {left:m?.left-x.left,right:x.right-(m?.right||0),main:m?.width}})
    assert.equal(rect.main,1200)
    assert.ok(Math.abs(rect.left-rect.right)<=1,`${path}: symmetric gutters`)
    assert.deepEqual(await page.locator('iframe').evaluateAll(els=>els.map(e=>[e.width,e.height])),[['300','250'],['300','300']])
    await page.locator('[data-ad-slot="bottom"]').scrollIntoViewIfNeeded()
    await page.locator('[data-ad-slot="bottom"] iframe').waitFor()
    assert.deepEqual(await page.locator('[data-ad-slot="bottom"] iframe').evaluate(e=>[e.width,e.height]),['300','100'])
   }
   if(path==='/preview/guesthouse'&&width===1920)await page.screenshot({path:'/tmp/stayhub-shared-ads-desktop.png',fullPage:true})
   if(path==='/preview/guesthouse'&&width===390){await page.locator('[data-ad-slot="bottom"]').scrollIntoViewIfNeeded();await page.locator('[data-ad-slot="bottom"] iframe').waitFor();await page.screenshot({path:'/tmp/stayhub-shared-ads-mobile.png',fullPage:true})}
  }
  const tabs=page.locator('nav[aria-label^="หมวดจัดการ"] button')
  for(let i=0;i<await tabs.count();i++){
   await tabs.nth(i).click()
   assert.equal(await page.locator('[data-shared-ad-layout="mock"]').count(),1,`${path}: tab ${i}`)
   assert.equal(await page.locator('[data-ad-slot="content"]').count(),1,`${path}: tab ${i} side slot`)
  }
 }
 await page.goto('/preview/guesthouse')
 await page.setViewportSize({width:1920,height:900})
 await page.locator('[data-ad-slot="content"]').waitFor()
 await page.emulateMedia({media:'print'})
 assert.equal(await page.locator('[data-ad-slot="content"]').evaluate(el=>getComputedStyle(el.closest('aside')).display),'none')
 assert.equal(await page.locator('[data-ad-slot="bottom"]').evaluate(el=>getComputedStyle(el.closest('aside')).display),'none')
 await page.emulateMedia({media:'screen'})
 await context.setOffline(true)
 await page.waitForFunction(()=>!document.querySelector('[data-shared-ad-layout]'))
 await context.setOffline(false)
 await page.waitForFunction(()=>!!document.querySelector('[data-shared-ad-layout]'))
 await page.evaluate(()=>{const d=document.createElement('div');d.setAttribute('role','dialog');d.id='mock-test-dialog';document.body.append(d)})
 await page.waitForFunction(()=>!document.querySelector('[data-shared-ad-layout]'))
 await page.evaluate(()=>document.getElementById('mock-test-dialog')?.remove())
 await page.waitForFunction(()=>!!document.querySelector('[data-shared-ad-layout]'))
 await page.goto('/cloud?login=1')
 assert.equal(await page.locator('[data-shared-ad-layout]').count(),0,'login does not mount ads')
 const tag=randomBytes(5).toString('hex')
 const reg=await context.request.post('/api/v2/register',{data:{email:`ads-${tag}@example.invalid`,password:'CI-ads-123456'},headers:{origin:base}})
 assert.equal(reg.status(),201)
 const property=await context.request.post('/api/v2/property',{data:{name:'CI apartment '+tag,type:'apartment'},headers:{origin:base}})
 assert.equal(property.status(),201)
 await page.goto('/cloud')
 await page.locator('[data-shared-ad-layout="mock"]').waitFor()
 assert.equal(await page.locator('[data-ad-slot="content"]').count(),1,'apartment dashboard')
 const apartmentTabs=page.locator('nav[aria-label="หมวดจัดการที่พัก"] button')
 for(let i=0;i<await apartmentTabs.count();i++){
  await apartmentTabs.nth(i).click()
  assert.equal(await page.locator('[data-ad-slot="content"]').count(),1,`apartment tab ${i}`)
 }
 assert.deepEqual(errors,[],'browser JavaScript errors')
 console.log('PASS shared ads: apartment, guesthouse, daily, homestay; nine widths; print, offline, dialog, login, no script errors')
}finally{await browser.close()}
