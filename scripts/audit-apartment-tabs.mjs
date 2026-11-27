#!/usr/bin/env node
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {chromium} from 'playwright'

const base=process.env.P26_E2E_BASE,db=process.env.DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||!db||new URL(db).hostname!=='127.0.0.1'||new URL(db).pathname!=='/stayhub_p26_ci')throw Error('Isolated localhost CI only')
const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
try{
 const ctx=await browser.newContext({baseURL:base})
 const tag=randomBytes(5).toString('hex')
 const origin={origin:base}
 let r=await ctx.request.post('/api/v2/register',{data:{email:`ui-audit-${tag}@example.invalid`,password:'CI-audit-123456'},headers:origin})
 assert.equal(r.status(),201)
 r=await ctx.request.post('/api/v2/property',{data:{name:'UI audit '+tag,type:'apartment'},headers:origin})
 assert.equal(r.status(),201)
 const page=await ctx.newPage()
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 for(const width of [360,390,430,768,1280,1366,1440,1600,1920]){
  await page.setViewportSize({width,height:850})
  await page.goto('/cloud')
  const nav=page.locator('nav[aria-label="หมวดจัดการที่พัก"]')
  await nav.waitFor()
  for(const button of await nav.locator('button').all()){
   await button.click()
   assert.equal(await button.getAttribute('aria-pressed'),'true',`${width}: apartment tab`)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${width}: apartment overflow`)
  }
 }
 assert.deepEqual(errors,[])
 console.log('PASS apartment: nine widths, every dashboard tab, no horizontal overflow or browser errors')
}finally{await browser.close()}
