#!/usr/bin/env node
// P5.8: a real installed Service Worker, offline reload and IndexedDB drafts.
// This runner cannot point at Railway/Neon/Production under any configuration.
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {chromium} from 'playwright'

const base=process.env.P26_E2E_BASE
const db=process.env.DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||
   !db||new URL(db).hostname!=='127.0.0.1'||
   new URL(db).pathname!=='/stayhub_p26_ci')
  throw new Error('REFUSED: P5.8 requires isolated localhost CI PostgreSQL')

const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
const context=await browser.newContext({baseURL:base,serviceWorkers:'allow'})
const room='Offline-room-'+randomBytes(5).toString('hex')
let page=await context.newPage()
page.setDefaultTimeout(20000)
async function state() {
  return page.evaluate(async () => {
    const open=indexedDB.open('stayhub-device-v1')
    const db=await new Promise((resolve,reject)=>{
      open.onsuccess=()=>resolve(open.result)
      open.onerror=()=>reject(open.error)
    })
    try {
      const tx=db.transaction(['units','meter_readings','bills','bill_items','sync_queue'],'readonly')
      const entries=await Promise.all(
        ['units','meter_readings','bills','bill_items','sync_queue'].map(store=>
          new Promise((resolve,reject)=>{
            const req=tx.objectStore(store).getAll()
            req.onsuccess=()=>resolve([store,req.result])
            req.onerror=()=>reject(req.error)
          }))
      )
      return Object.fromEntries(entries)
    } finally { db.close() }
  })
}
async function assertContents(){
  await page.getByRole('heading',{name:'ห้องพัก'}).waitFor()
  await page.locator('section').filter({has:page.getByRole('heading',{name:'ห้องพัก'})})
    .locator('li').filter({hasText:room}).waitFor()
  await page.locator('section').filter({has:page.getByRole('heading',{name:'มิเตอร์น้ำและไฟ'})})
    .locator('li').filter({hasText:'น้ำ 35'}).waitFor()
  await page.locator('section').filter({has:page.getByRole('heading',{name:'บิลรายเดือนในเครื่อง'})})
    .locator('li').filter({hasText:'Offline draft'}).waitFor()
  const current=await state()
  assert.equal(current.units.length,1)
  assert.equal(current.meter_readings.length,1)
  assert.equal(current.bills.length,1)
  assert.equal(current.bill_items.length,1)
  assert.equal(current.sync_queue.filter(x=>x.status==='pending').length,3)
  assert.ok(current.sync_queue.some(x=>x.entityType==='meter_readings'))
  assert.ok(current.sync_queue.some(x=>x.entityType==='bills'))
  assert.equal(current.bills[0].totalMinor,12345)
}
try {
  await page.goto('/start')
  await page.getByLabel('ชื่อผู้ดูแล').fill('CI Offline Owner')
  await page.getByLabel('ชื่อที่พัก').fill('CI PWA Offline Workspace')
  await page.getByRole('button',{name:'สร้างพื้นที่และเริ่มใช้งาน'}).click()
  await page.waitForURL('**/workspace')
  await page.getByRole('heading',{name:'ห้องพัก'}).waitFor()
  await page.evaluate(async () => {
    const worker=await navigator.serviceWorker.ready
    if(!worker.active)throw new Error('Service worker not active')
  })
  // Cache only after this controlled online reload; the first navigation may
  // happen before Service Worker installation.
  await page.reload()
  await page.getByRole('heading',{name:'ห้องพัก'}).waitFor()
  assert.equal(await page.evaluate(()=>Boolean(navigator.serviceWorker.controller)),true)
  await page.waitForFunction(async ()=>await caches.has('stayhub-local-shell-v3'))
  const manifest=await page.request.get('/manifest.webmanifest')
  assert.equal(manifest.status(),200)
  const json=await manifest.json()
  assert.equal(json.display,'standalone')
  assert.equal(json.scope,'/')
  console.log('PASS PWA manifest and active controlling service worker')

  // Confirm that authenticated Cloud routes and API responses are never stored.
  const cached=await page.evaluate(async ()=>{
    const keys=await caches.keys()
    const urls=(await Promise.all(keys.map(async key=>{
      const cache=await caches.open(key)
      return (await cache.keys()).map(req=>new URL(req.url).pathname)
    }))).flat()
    return urls
  })
  assert.ok(cached.includes('/workspace'),'workspace shell must be cached')
  assert.ok(cached.every(path=>!path.startsWith('/api/')&&!path.startsWith('/cloud')&&!path.startsWith('/platform')))
  console.log('PASS offline cache excludes authenticated APIs and Cloud pages')

  await context.setOffline(true)
  await page.reload({waitUntil:'domcontentloaded'})
  await page.getByRole('heading',{name:'ห้องพัก'}).waitFor()
  await page.getByLabel('ชื่อห้อง').fill(room)
  await page.getByRole('button',{name:'เพิ่มห้อง'}).click()
  await page.locator('li').filter({hasText:room}).waitFor()

  const meter=page.locator('section').filter({has:page.getByRole('heading',{name:'มิเตอร์น้ำและไฟ'})})
  await meter.getByLabel('ห้อง').selectOption({label:room})
  await meter.getByLabel('เลขมิเตอร์').fill('35')
  await meter.getByRole('button',{name:'บันทึกมิเตอร์'}).click()
  await meter.locator('li').filter({hasText:'น้ำ 35'}).waitFor()

  const billing=page.locator('section').filter({has:page.getByRole('heading',{name:'บิลรายเดือนในเครื่อง'})})
  await billing.getByLabel('ห้อง').selectOption({label:room})
  await billing.getByLabel('รอบบิล').fill('2026-11')
  await billing.getByLabel('รายการ').fill('Offline draft')
  await billing.getByLabel('จำนวนเงิน (บาท)').fill('123.45')
  await billing.getByRole('button',{name:'สร้างฉบับร่าง',exact:true}).click()
  await billing.locator('li').filter({hasText:'Offline draft'}).waitFor()
  await assertContents()
  console.log('PASS offline room, water meter and bill draft persist in IndexedDB queue')

  // Recreate the tab while the browser is still fully offline.
  await page.close()
  page=await context.newPage()
  page.setDefaultTimeout(20000)
  await page.goto('/workspace',{waitUntil:'domcontentloaded'})
  await assertContents()
  console.log('PASS offline closed/reopened tab loads cached shell with all drafts')

  await context.setOffline(false)
  await page.reload()
  await assertContents()
  console.log('PASS reconnect/reload does not silently send meter or bill drafts')

  const finalCached=await page.evaluate(async ()=>{
    const names=await caches.keys()
    return (await Promise.all(names.map(async name=>{
      const cache=await caches.open(name)
      return (await cache.keys()).map(req=>new URL(req.url).pathname)
    }))).flat()
  })
  assert.ok(finalCached.every(path=>!path.startsWith('/api/')&&!path.startsWith('/cloud')&&!path.startsWith('/platform')))
  console.log('PASS P5.8 isolated Chromium PWA offline persistence and cache isolation')
} finally {
  await context.close()
  await browser.close()
}
