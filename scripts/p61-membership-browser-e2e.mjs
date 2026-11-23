#!/usr/bin/env node
// Isolated Chromium P6.1 member page: no auth, no plan, active and expired.
// No production access or profile data is used.
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {chromium} from 'playwright'
import pg from 'pg'

const base=process.env.P26_E2E_BASE
const primary=process.env.DATABASE_URL
const member=process.env.STAYHUB_MEMBERSHIP_DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||
   primary!=='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_p26_ci'||
   member!=='postgresql://postgres:postgres@127.0.0.1:5432/stayhub_membership_ci')
  throw new Error('REFUSED: isolated localhost membership page test only')
const browser=await chromium.launch({headless:true})
const ctx=await browser.newContext({baseURL:base,serviceWorkers:'block'})
const db=new pg.Client({connectionString:member})
const tag=randomBytes(6).toString('hex')
try {
  const page=await ctx.newPage()
  await page.goto('/membership')
  await page.getByRole('heading',{name:'กรุณาเข้าสู่ระบบ'}).waitFor()
  assert.equal(await page.getByRole('heading',{name:'สถานะ: ใช้งานอยู่'}).count(),0)
  console.log('PASS anonymous user sees sign-in, no premium')

  const response=await ctx.request.post('/api/v2/register',{
    data:{email:`p61-ui-${tag}@example.invalid`,password:'P61-CI-Only-Strong-123!'},
    headers:{origin:base},
  })
  assert.equal(response.status(),201,'isolated account registered')
  const me=await ctx.request.get('/api/v2/me')
  assert.equal(me.status(),200)
  const accountId=(await me.json()).id
  assert.match(accountId,/^[0-9a-f-]{36}$/i)

  await page.reload()
  await page.getByRole('heading',{name:'สถานะ: ยังไม่มีแพ็กเกจ'}).waitFor()
  await page.getByText('ยังไม่มีสิทธิพิเศษที่เปิดใช้งานสำหรับบัญชีนี้').waitFor()
  console.log('PASS member without package sees no entitlements')

  await db.connect()
  await db.query(`INSERT INTO stayhub_membership.plans(code,title) VALUES('p61_pro','CI test plan')`)
  await db.query(`INSERT INTO stayhub_membership.entitlements(code) VALUES('p61_advanced_reports')`)
  await db.query(`INSERT INTO stayhub_membership.plan_entitlements(plan_code,entitlement_code) VALUES('p61_pro','p61_advanced_reports')`)
  await db.query(`INSERT INTO stayhub_membership.memberships(railway_account_id,plan_code,status,starts_at,ends_at,updated_by)
    VALUES($1,'p61_pro','active',now()-interval '1 day',now()+interval '30 days','CI')`,[accountId])
  await page.getByRole('button',{name:'ตรวจสอบอีกครั้ง'}).click()
  await page.getByRole('heading',{name:'สถานะ: ใช้งานอยู่'}).waitFor()
  await page.getByRole('listitem').filter({hasText:'p61_advanced_reports'}).waitFor()
  console.log('PASS active account shows only its authorized Neon plan and entitlements')

  await db.query(`UPDATE stayhub_membership.memberships SET status='suspended' WHERE railway_account_id=$1`,[accountId])
  await page.getByRole('button',{name:'ตรวจสอบอีกครั้ง'}).click()
  await page.getByRole('heading',{name:'สถานะ: ระงับสิทธิ์'}).waitFor()
  assert.equal(await page.getByRole('listitem').filter({hasText:'p61_advanced_reports'}).count(),0)
  console.log('PASS suspended membership hides premium entitlements')
  console.log('PASS P6.1 real Chromium membership page and safe states')
} finally {
  await db.end().catch(()=>{})
  await ctx.close()
  await browser.close()
}
