#!/usr/bin/env node
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {chromium} from 'playwright'
const base=process.env.P26_E2E_BASE,db=process.env.DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||
 !db||new URL(db).hostname!=='127.0.0.1'||new URL(db).pathname!=='/stayhub_p26_ci')throw Error('Isolated CI only')
const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
const owner=await browser.newContext({baseURL:base})
const scan=await browser.newContext({baseURL:base,viewport:{width:390,height:844},isMobile:true,hasTouch:true})
const tag=randomBytes(6).toString('hex')
async function post(context,path,data){const r=await context.request.post(path,{data,headers:{origin:base}});const j=await r.json();assert.equal(r.status(),201,path+' '+JSON.stringify(j));return j}
try{
 await post(owner,'/api/v2/register',{email:`pwa-owner-${tag}@example.invalid`,password:'CI-tenant-PWA-123456'})
 const property=(await post(owner,'/api/v2/property',{name:'PWA CI '+tag,type:'apartment'})).id
 const room=(await post(owner,'/api/v2/unit',{propertyId:property,name:'PWA-101'})).id
 const qr=await post(owner,'/api/v2/create-invite',{propertyId:property,unitId:room})
 const token=new URL(qr.url).searchParams.get('token')
 const path='/join?token='+token
 const page=await scan.newPage();page.setDefaultTimeout(20000)
 await page.goto(path)
 await page.getByAltText('StayHub').waitFor()
 assert.equal(await page.locator('input').count(),0,'scanner page must not show any form')
 assert.equal(await page.getByText(/สมัครสมาชิก|อีเมล|รหัสผ่าน|เข้าสู่ระบบ/).count(),0)
 const href=await page.locator('link[rel="manifest"]').first().getAttribute('href')
 assert.ok(href?.includes(token),'install manifest retains QR invitation')
 await page.evaluate(()=>{const e=new Event('beforeinstallprompt');Object.assign(e,{prompt:async()=>{},userChoice:Promise.resolve({outcome:'accepted'})});window.dispatchEvent(e)})
 await page.getByRole('button',{name:'ติดตั้งแอป'}).click()
 console.log('PASS mobile QR opens logo/install only; manifest start URL carries invitation')
 // Simulate a newly installed standalone context with no shared browser storage (iOS-safe handoff).
 const app=await browser.newContext({baseURL:base,viewport:{width:360,height:800},isMobile:true,hasTouch:true})
 await app.addInitScript(()=>{const original=window.matchMedia.bind(window);window.matchMedia=(query)=>query==='(display-mode: standalone)'?{matches:true,media:query,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true}}:original(query)})
 const installed=await app.newPage();installed.setDefaultTimeout(20000)
 await installed.goto(path)
 await installed.getByLabel('เลขห้อง').waitFor()
 assert.equal(await installed.locator('input').count(),1)
 await installed.getByLabel('เลขห้อง').fill('WRONG')
 await installed.getByRole('button',{name:'ยืนยันเลขห้อง'}).click()
 await installed.getByText('เลขห้องไม่ตรงกับ QR นี้').waitFor()
 await installed.getByLabel('เลขห้อง').fill('PWA-101')
 await installed.getByRole('button',{name:'ยืนยันเลขห้อง'}).click()
 await installed.getByText('รอเจ้าของอนุมัติ').waitFor()
 const requests=await (await owner.request.get('/api/v2/requests?propertyId='+property)).json()
 const pending=requests.items.find(x=>x.device_id&&x.status==='pending')
 assert.ok(pending);assert.equal(pending.unit_id,room)
 const ownerPage=await owner.newPage()
 await ownerPage.goto('/cloud?tab=residents')
 await ownerPage.getByRole('button',{name:'ดูคำขอเข้าร่วม'}).click()
 const requestCard=ownerPage.locator('.card').filter({hasText:'ผู้เช่าจากอุปกรณ์'}).filter({hasText:'PWA-101'}).last()
 await requestCard.getByRole('button',{name:'อนุมัติผูกห้อง'}).click()
 await installed.waitForURL('**/my')
 await installed.getByText('PWA-101').first().waitFor()
 const saved=await app.storageState()
 await app.close()
 const reopened=await browser.newContext({baseURL:base,storageState:saved,viewport:{width:390,height:844},isMobile:true})
 await reopened.addInitScript(()=>{const original=window.matchMedia.bind(window);window.matchMedia=(query)=>query==='(display-mode: standalone)'?{matches:true,media:query,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true}}:original(query)})
 const again=await reopened.newPage();await again.goto(path);await again.waitForURL('**/my');await again.getByText('PWA-101').first().waitFor()
 await requestCard.getByRole('button',{name:'ยกเลิกสิทธิ์อุปกรณ์'}).click()
 await ownerPage.getByText('ยกเลิกสิทธิ์อุปกรณ์แล้ว').waitFor()
 assert.equal((await reopened.request.get('/api/v2/my-stays')).status(),401)
 await reopened.close()
 console.log('PASS standalone launch, one room field, owner approval, reopened app, device revocation')
}finally{await owner.close();await scan.close();await browser.close()}
