#!/usr/bin/env node
// Browser E2E: click actual StayHub React UI with intercepted synthetic responses.
// Uses local Next.js + Chromium; NEVER sends requests to Railway/Production.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {chromium} from 'playwright'
if(process.env.CI!=='true'||process.env.STAYHUB_BROWSER_E2E!=='YES')throw Error('CI-only browser contract')
const BASE='http://127.0.0.1:3000'
const P='00000000-0000-4000-8000-000000000001'
const U='00000000-0000-4000-8000-000000000002'
const STAY='00000000-0000-4000-8000-000000000003'
const LEASE='00000000-0000-4000-8000-000000000004'
const state={writes:[],signupMode:false}
const owner={items:[{id:P,name:'Staging Browser Test',role:'owner'}]}
const resident={items:[{stay_id:STAY,unit_id:U,unit_name:'A101',email:'tenant@example.invalid',starts_at:'2026-11-01',ends_at:null}]}
const leases={items:[{id:LEASE,stay_id:STAY,unit_id:U,unit_name:'A101',monthly_rent:'4000.00',security_deposit:'0.00',starts_on:'2026-11-01',status:'active'}]}
function response(path,method,body,headers){
 if(method==='POST'){
  state.writes.push({path,body,headers})
  if(path==='/api/v2/register'){state.signupMode=false;return {ok:true}}
  if(path==='/api/v2/unit')return {id:U}
  if(path==='/api/v2/leases')return {id:LEASE,status:'created'}
  if(path==='/api/v2/bills')return {id:'00000000-0000-4000-8000-000000000005',total:'4000.00'}
  return {ok:true}
 }
 if(path==='/api/v2/properties')return owner
 if(path==='/api/v2/me'&&state.signupMode)return {error:'Please sign in'}
 if(path==='/api/v2/me')return {id:'00000000-0000-4000-8000-000000000010',email:'owner@example.invalid'}
 if(path==='/api/v2/my-stays')return {items:[]}
 if(path==='/api/v2/occupancy')return {items:[]}
 if(path==='/api/v2/residents')return resident
 if(path==='/api/v2/blocks')return {items:[]}
 if(path==='/api/v2/units')return {items:[{id:U,name:'A101'}]}
 if(path==='/api/v2/leases')return leases
 if(path==='/api/v2/bills')return {items:[{id:'00000000-0000-4000-8000-000000000005',property_id:P,unit_name:'A101',period:'2026-11-01',total:'4000.00',paid:'0.00',outstanding:'4000.00',status:'unpaid'}],hasMore:false}
 if(path==='/api/v2/bills/00000000-0000-4000-8000-000000000005')return {bill:{id:'00000000-0000-4000-8000-000000000005',property_id:P,unit_name:'A101',period:'2026-11-01',created_at:'2026-11-05',total:'4000.00',status:'paid'},items:[{label:'ค่าเช่า',quantity:'1',unitRate:'4000.00',amount:'4000.00'}],paid:'4000.00',outstanding:'0.00',payments:[]}
 if(path==='/api/v2/bills/summary')return {billCount:1,billedTotal:'4000.00',paidTotal:'0.00',outstandingTotal:'4000.00',unpaidCount:1}
 if(path==='/api/v2/operations')return {owner:true,items:[]}
 if(path==='/api/v2/repairs')return {owner:true,items:[{id:'00000000-0000-4000-8000-000000000009',unit_name:'A101',title:'Leaking Tap',detail:'Staging mock',status:'submitted',appointment_at:null,appointment_reply:null,created_at:'2026-11-01'}]}
 return {items:[]}
}
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({acceptDownloads:true})
await page.route('**/api/v2/**',async route=>{
 const req=route.request(),url=new URL(req.url())
 const body=req.method()==='POST'?JSON.parse(req.postData()||'{}'):null
 const result=response(url.pathname,req.method(),body,req.headers())
 await route.fulfill({status:req.method()==='POST'?201:(url.pathname==='/api/v2/me'&&state.signupMode?401:200),contentType:'application/json',body:JSON.stringify(result)})
})
try{
 state.signupMode=true
 await page.goto(BASE+'/')
 await page.getByRole('heading',{name:'เลือกประเภทที่พักของคุณ'}).waitFor()
 assert.equal(await page.locator('.welcomeChoice').count(),4)
 await page.getByRole('button',{name:/หอพัก \/ อพาร์ตเมนต์/}).click()
 await page.waitForURL(/\/cloud\?type=apartment/)
 await page.getByRole('heading',{name:'สมัครสมาชิกเจ้าของที่พัก'}).waitFor()
 const passwordField=page.getByLabel('รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)')
 assert.equal(await passwordField.getAttribute('minlength'),'6')
 await passwordField.fill('123456')
 await page.getByRole('button',{name:'แสดงรหัสผ่าน'}).click()
 assert.equal(await passwordField.getAttribute('type'),'text')
 await page.getByRole('button',{name:'ซ่อนรหัสผ่าน'}).click()
 assert.equal(await passwordField.getAttribute('type'),'password')
 await page.getByLabel('อีเมล').fill('onboarding@example.invalid')
 await page.getByRole('button',{name:'สมัครสมาชิกและดำเนินการต่อ'}).click()
 await page.getByText('เข้าสู่ระบบสำเร็จ').waitFor()
 assert.ok(state.writes.some(x=>x.path==='/api/v2/register'&&x.body.password==='123456'))
 console.log('PASS browser: four large categories, mandatory registration, 6-character password and reveal/hide')

 await page.goto(BASE+'/cloud/rooms')
 await page.getByPlaceholder('เช่น A101').fill('A102')
 await page.getByRole('button',{name:'+ เพิ่มห้อง'}).click()
 await page.getByRole('status').getByText('เพิ่มห้องเรียบร้อย').waitFor()
 assert.ok(state.writes.some(x=>x.path==='/api/v2/unit'&&x.body.propertyId===P&&x.body.name==='A102'))
 console.log('PASS browser: create room')

 await page.goto(BASE+'/cloud/leases')
 await page.getByLabel('ค่าเช่าต่อเดือน (บาท)').fill('4000')
 await page.getByRole('button',{name:'สร้างสัญญาเช่า'}).click()
 await page.getByText('สร้างสัญญาเช่าสำเร็จ').waitFor()
 assert.ok(state.writes.some(x=>x.path==='/api/v2/leases'&&x.body.propertyId===P&&x.body.stayId===STAY))
 console.log('PASS browser: create lease')

 await page.goto(BASE+'/cloud/billing')
 await page.getByRole('button',{name:'ออกบิล',exact:true}).click()
 await page.getByText(/ออกบิลเรียบร้อย/).waitFor()
 assert.ok(state.writes.some(x=>x.path==='/api/v2/bills'&&x.headers['idempotency-key']))
 console.log('PASS browser: issue bill with idempotency')

 await page.goto(BASE+'/cloud/operations?kind=announcements')
 await page.getByLabel('หัวข้อ').fill('ประกาศทดสอบ')
 await page.getByLabel('รายละเอียด').fill('ทดสอบปุ่ม')
 await page.getByRole('button',{name:'บันทึก ประกาศ'}).click()
 await page.getByRole('status').getByText('บันทึกสำเร็จ').waitFor()
 assert.ok(state.writes.some(x=>x.path==='/api/v2/operations'&&x.body.action==='announcement-add'&&x.body.propertyId===P))
 console.log('PASS browser: save announcement')

 await page.goto(BASE+'/cloud/repairs')
 await page.getByRole('button',{name:'รับงาน'}).click()
 await page.getByRole('status').getByText('บันทึกสำเร็จ').waitFor()
 assert.ok(state.writes.some(x=>x.path==='/api/v2/repairs'&&x.body.action==='transition'&&x.body.status==='accepted'))
 console.log('PASS browser: accept repair')

 await page.goto(BASE+'/cloud/operations?kind=parcels')
 await page.getByLabel('บริษัทขนส่ง').fill('Test Express')
 await page.getByRole('button',{name:'บันทึก พัสดุ'}).click()
 await page.getByRole('status').getByText('บันทึกสำเร็จ').waitFor()
 assert.ok(state.writes.some(x=>x.path==='/api/v2/operations'&&x.body.action==='parcel-add'&&x.body.unitId===U))
 console.log('PASS browser: receive parcel')

 await page.goto(BASE+'/cloud/operations?kind=vehicles')
 await page.getByLabel('ทะเบียนรถ').fill('กก-1234')
 await page.getByLabel('ประเภทรถ').fill('car')
 await page.getByRole('button',{name:'บันทึก รถของห้อง'}).click()
 await page.getByRole('status').getByText('บันทึกสำเร็จ').waitFor()
 assert.ok(state.writes.some(x=>x.path==='/api/v2/operations'&&x.body.action==='vehicle-add'))
 console.log('PASS browser: add vehicle')

 await page.goto(BASE+'/cloud/operations?kind=drivers')
 await page.getByLabel('ชื่อคนขับ').fill('ทดสอบคนขับ')
 await page.getByLabel('เบอร์โทร').fill('0000000000')
 await page.getByLabel('ประเภทรถ').fill('car')
 await page.getByRole('button',{name:'บันทึก คนขับ'}).click()
 await page.getByRole('status').getByText('บันทึกสำเร็จ').waitFor()
 assert.ok(state.writes.some(x=>x.path==='/api/v2/operations'&&x.body.action==='driver-add'))
 console.log('PASS browser: add driver')

 await page.goto(BASE+'/cloud/operations?kind=documents')
 await page.getByLabel('หัวข้อเอกสาร').fill('กฎอาคาร')
 await page.getByLabel('ข้อความที่ผู้พักเห็น').fill('กฎทดสอบ')
 await page.getByRole('button',{name:'บันทึก เอกสารข้อความ'}).click()
 await page.getByRole('status').getByText('บันทึกสำเร็จ').waitFor()
 assert.ok(state.writes.some(x=>x.path==='/api/v2/operations'&&x.body.action==='document-add'))
 console.log('PASS browser: save document text')

 await page.goto(BASE+'/cloud/receipts/00000000-0000-4000-8000-000000000005?propertyId='+P)
 await page.getByRole('heading',{name:'ใบรับชำระเงิน'}).waitFor()
 await page.getByRole('button',{name:'พิมพ์ / บันทึกเป็น PDF'}).waitFor()
 console.log('PASS browser: paid receipt has PDF print control')

 await page.goto(BASE+'/cloud/reports')
 await page.getByRole('button',{name:'ส่งออก CSV'}).waitFor()
 const dl=page.waitForEvent('download')
 await page.getByRole('button',{name:'ส่งออก CSV'}).click()
 const download=await dl
 assert.match(download.suggestedFilename(),/^stayhub-.*\.csv$/)
 const csv=readFileSync(await download.path(),'utf8')
 assert.match(csv,/A101/)
 console.log('PASS browser: download real CSV')
 console.log('PASS browser UI workflow (mocked API); backend staging is verified separately')
}finally{await browser.close()}
