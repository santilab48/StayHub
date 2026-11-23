#!/usr/bin/env node
// Two independent Chromium browser contexts + disposable localhost Postgres.
// Never issue test writes to Railway, Neon, or any non-local database.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { chromium } from 'playwright'

const base = process.env.P26_E2E_BASE
const databaseURL = process.env.DATABASE_URL
if (process.env.CI !== 'true' || base !== 'http://127.0.0.1:3000' ||
    process.env.STAYHUB_LOCAL_SYNC_TEST !== '1' || !databaseURL ||
    new URL(databaseURL).hostname !== '127.0.0.1' ||
    new URL(databaseURL).pathname !== '/stayhub_p26_ci')
  throw new Error('REFUSED: real browser sync E2E requires isolated localhost CI PostgreSQL')

const tag = randomBytes(7).toString('hex')
const email = `p53-${tag}@example.invalid`
const password = 'P53-ci-disposable-Only-1234!'
const propertyName = `P53 browser property ${tag}`
const roomName = `Browser-101-${tag}`
const roomOnA = `From-A-${tag}`
const roomOnB = `From-B-${tag}`

const browser = await chromium.launch({ headless: true })
const a = await browser.newContext({ baseURL: base, serviceWorkers: 'block' })
const b = await browser.newContext({ baseURL: base, serviceWorkers: 'block' })
const pageA = await a.newPage()
const pageB = await b.newPage()
pageA.setDefaultTimeout(15000)
pageB.setDefaultTimeout(15000)

async function api(ctx,path,data) {
  const response = await ctx.request.post(path,{
    data,headers:{origin:base,'content-type':'application/json'}
  })
  const value = await response.json().catch(()=>null)
  assert.ok(response.ok(),`API ${path}: ${response.status()} ${JSON.stringify(value)}`)
  return value
}

async function setupBrowser(page,owner,serverPropertyId) {
  await page.goto('/start')
  await page.getByLabel('ชื่อผู้ดูแล').fill(owner)
  await page.getByLabel('ชื่อที่พัก').fill(`Device ${owner}`)
  await page.getByRole('button',{name:'สร้างพื้นที่และเริ่มใช้งาน'}).click()
  await page.waitForURL('**/workspace')
  await page.getByRole('button',{name:'เลือกที่พักจากบัญชี Staging'}).click()
  const propertySelect=page.locator('section').filter({
    has:page.getByRole('heading',{name:'สถานะการซิงก์'})
  }).locator('select')
  await propertySelect.selectOption(serverPropertyId)
  await page.getByRole('button',{name:'เชื่อมที่พัก'}).click()
  // Connecting is an async local IndexedDB transaction. Wait for the link
  // and the commit handler to finish, rather than asserting immediately.
  await page.waitForFunction(() => Array.from(document.querySelectorAll('button'))
    .some(button => button.textContent?.trim() === 'ซิงก์ตอนนี้' && !button.disabled))
}

async function editRoom(page,oldName,newName) {
  const line=page.locator('li').filter({hasText:oldName})
  await line.getByRole('button',{name:'แก้ไข'}).click()
  await page.getByLabel('ชื่อห้อง').fill(newName)
  await page.getByRole('button',{name:'บันทึกการแก้ไข'}).click()
  await page.locator('li').filter({hasText:newName}).waitFor()
}

async function pushOrPull(page) {
  await page.getByRole('button',{name:'ซิงก์ตอนนี้'}).click()
  // The existing commit helper refreshes local state and shows completion.
  await page.getByRole('status').filter({hasText:'บันทึกในเครื่องแล้ว'}).waitFor()
}

try {
  await api(a,'/api/v2/register',{email,password})
  await api(b,'/api/v2/login',{email,password})
  const {id:propertyId}=await api(a,'/api/v2/property',{
    name:propertyName,type:'apartment'
  })
  assert.match(propertyId,/^[0-9a-f-]{36}$/i)
  await setupBrowser(pageA,'Alice',propertyId)
  await setupBrowser(pageB,'Bob',propertyId)

  await pageA.getByLabel('ชื่อห้อง').fill(roomName)
  await pageA.getByRole('button',{name:'เพิ่มห้อง'}).click()
  await pageA.locator('li').filter({hasText:roomName}).waitFor()
  await pushOrPull(pageA)
  await pushOrPull(pageB)
  await pageB.locator('li').filter({hasText:roomName}).waitFor()
  console.log('PASS Chromium contexts A → server → B room transfer')

  // One browser edits offline while the other sends a fresh server revision.
  await b.setOffline(true)
  await editRoom(pageB,roomName,roomOnB)
  await editRoom(pageA,roomName,roomOnA)
  await pushOrPull(pageA)
  await b.setOffline(false)
  await pushOrPull(pageB)
  await pageB.getByText(/มีข้อขัดแย้ง 1/).waitFor()
  await pageB.locator('li').filter({hasText:roomOnB}).waitFor()
  console.log('PASS offline B edit retained through conflicting pull')

  await pageB.getByRole('button',{name:'ดูข้อขัดแย้ง'}).click()
  await pageB.getByRole('button',{name:'เก็บข้อมูลในเครื่อง'}).click()
  await pageB.getByText(/รอซิงก์ 1/).waitFor()
  await pushOrPull(pageB)
  await pushOrPull(pageA)
  await pageA.locator('li').filter({hasText:roomOnB}).waitFor()
  console.log('PASS conflict rebase and browser B → server → A return transfer')

  await pageA.reload()
  await pageB.reload()
  await pageA.locator('li').filter({hasText:roomOnB}).waitFor()
  await pageB.locator('li').filter({hasText:roomOnB}).waitFor()
  console.log('PASS both browser IndexedDB stores persist after reload')
  console.log('PASS P5.3 real Chromium two-context / isolated PostgreSQL E2E')
} finally {
  await Promise.allSettled([a.close(),b.close()])
  await browser.close()
}
