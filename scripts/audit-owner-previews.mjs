#!/usr/bin/env node
import assert from 'node:assert/strict'
import {chromium} from 'playwright'

if(process.env.UI_AUDIT_BASE!=='http://127.0.0.1:3000')throw Error('Local preview only')
const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
try{
 const page=await browser.newPage()
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 for(const type of ['guesthouse','daily','homestay']){
  for(const width of [360,390,430,768,1280,1366,1440,1600,1920]){
   await page.setViewportSize({width,height:850})
   await page.goto(`http://127.0.0.1:3000/preview/${type}`)
   const nav=page.locator('nav[aria-label^="หมวดจัดการ"]')
   await nav.waitFor()
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${type} ${width}: page overflow`)
   assert.equal(await nav.getAttribute('aria-label'),`หมวดจัดการ${{guesthouse:'เกสต์เฮาส์',daily:'ที่พักรายวัน',homestay:'โฮมสเตย์'}[type]}`)
   for(const button of await nav.locator('button').all()){
    await button.click()
    assert.equal(await button.getAttribute('aria-pressed'),'true',`${type} ${width}: tab selection`)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${type} ${width}: tab overflow`)
   }
  }
 }
 assert.deepEqual(errors,[])
 console.log('PASS owner preview: three types, nine widths, every top tab, no page overflow or browser errors')
}finally{await browser.close()}
