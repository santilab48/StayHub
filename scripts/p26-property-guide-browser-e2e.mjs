import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {chromium} from 'playwright'
const base=process.env.P26_E2E_BASE,db=process.env.DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||!db||new URL(db).hostname!=='127.0.0.1'||new URL(db).pathname!=='/stayhub_p26_ci')throw Error('Isolated CI only')
const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
const types={apartment:'หอพัก / อพาร์ตเมนต์',guesthouse:'เกสต์เฮาส์',daily:'ที่พักรายวัน',homestay:'โฮมสเตย์'}
try{
 for(const [type,label] of Object.entries(types)){
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  try{
   async function post(path,data){const r=await ctx.request.post(path,{data,headers:{origin:base}});assert.equal(r.status(),201,path+' '+await r.text());return r.json()}
   await post('/api/v2/register',{email:'guide-'+type+'-'+randomBytes(6).toString('hex')+'@example.invalid',password:'CI-guide-123456'})
   await post('/api/v2/property',{name:'Guide '+type,type})
   const page=await ctx.newPage(),errors=[]
   page.on('pageerror',e=>errors.push(e.message))
   await page.goto('/cloud?type='+type)
   const nav=page.locator('nav[aria-label^="หมวดจัดการ"]')
   await nav.waitFor()
   if(type!=='apartment')await nav.getByRole('button',{name:'ตั้งค่าที่พัก',exact:true}).click()
   const guide=page.getByRole('region',{name:'วิธีใช้และตั้งค่าที่พัก'})
   await guide.waitFor()
   assert.ok((await guide.innerText()).includes('คู่มือสำหรับ'+label))
   const buttons=guide.locator('button[aria-expanded]')
   assert.equal(await buttons.count(),type==='apartment'?7:6)
   assert.equal(await guide.locator('button[aria-expanded="true"]').count(),0)
   for(const width of [320,360,375,390,430]){
    await page.setViewportSize({width,height:844})
    for(const button of await buttons.all()){
     await button.click()
     assert.equal(await guide.locator('button[aria-expanded="true"]').count(),1)
     const id=await button.getAttribute('aria-controls')
     assert.ok(await guide.locator('[id='+JSON.stringify(id)+']').isVisible())
     assert.ok(await guide.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'guide overflow '+type+' '+width)
     assert.ok(await button.evaluate(e=>e.getBoundingClientRect().height>=44),'touch target')
    }
    await buttons.last().click()
    assert.equal(await guide.locator('button[aria-expanded="true"]').count(),0)
   }
   assert.deepEqual(errors,[])
   console.log('PASS guide '+type+' at five mobile widths')
  }finally{await ctx.close()}
 }
}finally{await browser.close()}
