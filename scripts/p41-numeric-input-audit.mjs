#!/usr/bin/env node
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {chromium} from 'playwright'
import pg from 'pg'

const base=process.env.P26_E2E_BASE,raw=process.env.DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||!raw||new URL(raw).hostname!=='127.0.0.1'||new URL(raw).pathname!=='/stayhub_p26_ci')throw Error('Isolated localhost test only')
const browser=await chromium.launch({headless:true,executablePath:process.env.STAYHUB_CHROMIUM_PATH||'/usr/bin/chromium'})
const db=new pg.Client({connectionString:raw})
const tag=randomBytes(5).toString('hex')
const post=async(ctx,path,data)=>{const r=await ctx.request.post(path,{data,headers:{origin:base}});assert.equal(r.status(),201,`${path}: ${await r.text()}`);return r.json()}
async function checkInput(input,{final='12.50',decimal=true}={}){
 assert.equal(await input.inputValue(),'','new input must be empty')
 const mode=await input.getAttribute('inputmode'),type=await input.getAttribute('type')
 assert.ok(mode==='decimal'||mode==='numeric'||type==='number',`numeric mobile keyboard: ${mode}/${type}`)
 await input.fill('123');assert.equal(await input.inputValue(),'123')
 await input.fill('');assert.equal(await input.inputValue(),'')
 await input.fill('0');assert.equal(await input.inputValue(),'0')
 await input.fill('');await input.evaluate(async (_e,value)=>navigator.clipboard.writeText(value),final)
 await input.press('ControlOrMeta+V');assert.equal(await input.inputValue(),final,'paste must preserve typed digits')
 if(decimal){await input.fill('1.25');assert.equal(await input.inputValue(),'1.25');await input.fill(final)}
}
try{
 await db.connect()
 {
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  await ctx.grantPermissions(['clipboard-read','clipboard-write'])
  await post(ctx,'/api/v2/register',{email:`p41-apartment-${tag}@example.invalid`,password:'CI-numeric-123456'})
  const property=(await post(ctx,'/api/v2/property',{name:'P41 apartment',type:'apartment'})).id
  const unit=(await post(ctx,'/api/v2/unit',{propertyId:property,name:'A101'})).id
  const page=await ctx.newPage();await page.goto(`/cloud/leases?unitId=${unit}`)
  const form=page.locator('form');await form.waitFor()
  for(const [index,value] of [['0','4200.50'],['1','0'],['2','0'],['3','12.25'],['4','4.50'],['5','100'],['6','5']])await checkInput(form.locator('input[type="number"]').nth(Number(index)),{final:value,decimal:index!=='6'})
  await form.getByLabel('ชื่อผู้ให้เช่า').fill('Test Owner')
  await form.getByLabel('ที่อยู่ผู้ให้เช่า').fill('Test Address')
  await form.getByLabel('ชื่อผู้เช่า').fill('Test Tenant')
  await form.getByLabel('ที่อยู่ผู้เช่า').fill('Test Address')
  await form.getByLabel('ที่ตั้งห้องพัก').fill('Test Property')
  await form.getByRole('button',{name:'ตรวจตัวอย่างสัญญา A4'}).click()
  await page.getByRole('button',{name:'บันทึกสัญญา'}).click()
  await page.getByRole('heading',{name:'บันทึกแล้ว'}).waitFor()
  const contracts=await db.query('SELECT snapshot FROM stayhub.room_contracts WHERE unit_id=$1',[unit])
  assert.equal(contracts.rowCount,1)
  assert.equal(contracts.rows[0].snapshot.rent,'4200.50')
  assert.equal(contracts.rows[0].snapshot.deposit,'0')
  await page.goto('/cloud/billing')
  await page.getByRole('combobox').first().selectOption({index:1})
  const other=page.getByLabel('ค่าอื่น ๆ (บาท)',{exact:true})
  await checkInput(other,{final:'12.50'})
  const meter=page.getByRole('heading',{name:'ค่าน้ำ',exact:true}).locator('..')
  await meter.getByLabel('เลขมิเตอร์ใหม่').waitFor()
  await checkInput(meter.getByLabel('เลขมิเตอร์ใหม่'),{final:'125.50'})
  await meter.getByLabel('เลขมิเตอร์เดิม').fill('100')
  await meter.getByRole('button',{name:'บันทึกมิเตอร์น้ำ'}).click()
  await page.getByRole('heading',{name:'ค่าน้ำ · บันทึกแล้ว'}).waitFor()
  const readings=await db.query("SELECT current_reading FROM stayhub.billing_meter_readings WHERE property_id=$1 AND meter_type='water'",[property])
  assert.equal(readings.rowCount,1)
  assert.equal(Number(readings.rows[0].current_reading),125.5)
  await page.goto('/cloud/operations?kind=settings')
  const settings=page.locator('form').first();await settings.waitFor()
  for(const [label,value] of [['ค่าน้ำ/หน่วย','12.25'],['ค่าไฟ/หน่วย','4.50'],['วันครบกำหนด','5'],['ค่าปรับ','0']])await checkInput(settings.getByLabel(label),{final:value,decimal:label!=='วันครบกำหนด'})
  await settings.getByRole('button',{name:'บันทึก ตั้งราคา'}).click()
  await page.getByRole('status').getByText('บันทึกสำเร็จ').waitFor()
  const savedSettings=await db.query('SELECT water_rate,electric_rate,due_day,late_fee FROM stayhub.property_settings WHERE property_id=$1',[property])
  assert.equal(savedSettings.rowCount,1);assert.equal(Number(savedSettings.rows[0].water_rate),12.25);assert.equal(Number(savedSettings.rows[0].late_fee),0)
  console.log('PASS apartment: contract, meter, and settings numeric typing and PostgreSQL saves; billing other amount')
  await ctx.close()
 }
 {
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  await ctx.grantPermissions(['clipboard-read','clipboard-write'])
  const page=await ctx.newPage();await page.goto('/preview/guesthouse')
  await page.locator('nav[aria-label^="หมวดจัดการ"] button').filter({hasText:'รับเงิน'}).click()
  await page.getByRole('button',{name:/101/}).first().click()
  for(const [label,value] of [['หักเงินมัดจำ','0'],['ส่วนลด','12.25']])await checkInput(page.getByLabel(new RegExp(label)),{final:value})
  await page.getByRole('button',{name:'+ เพิ่มรายการ'}).click()
  await checkInput(page.getByLabel('จำนวนเงิน'),{final:'18.50'})
  console.log('PASS cashier preview: deposit, discount, extra charge numeric typing and paste')
  await ctx.close()
 }
 for(const type of ['guesthouse','daily','homestay']){
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  await ctx.grantPermissions(['clipboard-read','clipboard-write'])
  await post(ctx,'/api/v2/register',{email:`p41-${type}-${tag}@example.invalid`,password:'CI-numeric-123456'})
  const property=(await post(ctx,'/api/v2/property',{name:`P41 ${type}`,type})).id
  const page=await ctx.newPage();await page.goto(`/cloud?type=${type}`)
  await page.locator('nav[aria-label^="หมวดจัดการ"] button').filter({hasText:'จัดการห้องพัก'}).click()
  const form=page.locator('#guesthouse-room-form form');await form.waitFor()
  const labels=[['ขนาดห้อง','31.25'],['จำนวนผู้เข้าพักสูงสุด','3'],['ราคาต่อคืน','123.45'],['ราคาวันหยุด','150.50']]
  for(const [label,value] of labels)await checkInput(form.getByLabel(new RegExp(label)),{final:value,decimal:label!=='จำนวนผู้เข้าพักสูงสุด'})
  await form.getByLabel('เลขห้อง / ชื่อห้อง').fill('N101')
  await form.getByRole('button',{name:'บันทึกห้องพัก'}).click()
  await page.getByRole('status').getByText('บันทึกข้อมูลห้องแล้ว').waitFor()
  const saved=await db.query('SELECT u.id,u.room_details FROM stayhub.units u WHERE u.property_id=$1 AND u.name=$2',[property,'N101'])
  assert.equal(saved.rowCount,1)
  assert.equal(Number(saved.rows[0].room_details.area),31.25)
  assert.equal(Number(saved.rows[0].room_details.capacity),3)
  assert.equal(Number(saved.rows[0].room_details.nightlyRate),123.45)
  assert.equal(Number(saved.rows[0].room_details.weekendRate),150.5)
  await page.locator('#guesthouse-room-form').getByText('N101').count()
  await page.getByRole('button',{name:'แก้ไขรายละเอียด'}).first().click()
  assert.equal(await form.getByLabel(/ราคาต่อคืน/).inputValue(),'123.45','saved value must be shown on edit')
  await page.locator('nav[aria-label^="หมวดจัดการ"] button').filter({hasText:'การจอง'}).click()
  const booking=page.locator('#guesthouse-booking-form form')
  for(const [label,value] of [['ผู้ใหญ่','2'],['เด็ก','0'],['ราคาต่อคืน','99.75']])await checkInput(booking.getByLabel(new RegExp(label)),{final:value,decimal:label==='ราคาต่อคืน'})
  console.log(`PASS ${type}: room numeric typing, zero, decimals, PostgreSQL save/edit; booking numeric typing`)
  await ctx.close()
 }
}finally{await db.end().catch(()=>{});await browser.close()}
