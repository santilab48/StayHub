#!/usr/bin/env node
import assert from 'node:assert/strict'
import {chromium} from 'playwright'

if(process.env.SHARED_AD_TEST_BASE!=='http://127.0.0.1:3000'||!['left','right','bottom'].includes(process.env.SHARED_AD_EXPECTED_SLOTS))throw Error('Local mock toggle test only')
const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}})
 await page.goto('http://127.0.0.1:3000/preview/guesthouse')
 const target=process.env.SHARED_AD_EXPECTED_SLOTS
 await page.locator('[data-shared-ad-layout="mock"]').waitFor()
 assert.equal(await page.locator('[data-ad-slot="content"]').count(),target==='left'?1:0)
 assert.equal(await page.locator('[data-ad-slot="right"]').count(),target==='right'?1:0)
 assert.equal(await page.locator('[data-ad-slot="bottom"]').count(),target==='bottom'?1:0)
 if(target==='right'||target==='left'){
  const mainWidth=await page.locator('[data-shared-ad-layout] > [class*="main"]').evaluate(el=>el.getBoundingClientRect().width)
  assert.ok(mainWidth>1000,'main workspace expands when left side is disabled')
 }
 await page.setViewportSize({width:390,height:900})
 if(target==='right'||target==='left')await page.waitForFunction(()=>!document.querySelector('[data-shared-ad-layout]'))
 else assert.equal(await page.locator('[data-ad-slot="bottom"]').count(),1)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)
 console.log('PASS independent '+target+' banner toggle and centered workspace')
}finally{await browser.close()}
