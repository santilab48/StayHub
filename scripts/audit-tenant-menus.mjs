#!/usr/bin/env node
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {chromium} from 'playwright'
import {PDFDocument} from 'pdf-lib'

const base=process.env.P26_E2E_BASE,raw=process.env.DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||!raw||new URL(raw).hostname!=='127.0.0.1'||new URL(raw).pathname!=='/stayhub_p26_ci')throw Error('Isolated localhost CI only')
const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
const owner=await browser.newContext({baseURL:base}),tenant=await browser.newContext({baseURL:base,viewport:{width:390,height:844}})
const tag=randomBytes(5).toString('hex')
const post=async(ctx,path,data)=>{const r=await ctx.request.post(path,{data,headers:{origin:base}});assert.equal(r.status(),201,`${path}: ${await r.text()}`);return r.json()}
try{
 await post(owner,'/api/v2/register',{email:`tenant-ui-owner-${tag}@example.invalid`,password:'CI-tenant-ui-123456'})
 const property=(await post(owner,'/api/v2/property',{name:'Tenant UI audit '+tag,type:'apartment'})).id
 const unit=(await post(owner,'/api/v2/unit',{propertyId:property,name:'A101'})).id
 const date=new Date(Date.now()+7*3600000).toISOString().slice(0,7)+'-01'
 const ends=String(Number(date.slice(0,4))+1)+date.slice(4)
 await post(owner,'/api/v2/room-contracts',{unitId:unit,signedAt:date,startsOn:date,endsOn:ends,landlord:'Audit Owner',landlordAddress:'Audit Address',landlordPhone:'',tenant:'Audit Tenant',tenantAddress:'Audit Address',tenantPhone:'',propertyAddress:'Audit Property',rent:'4000',deposit:'0',advance:'0',water:'0',electric:'0',service:'0',dueDay:'5',inventory:'',terms:''})
 const invite=await post(owner,'/api/v2/create-invite',{propertyId:property,unitId:unit})
 await post(tenant,'/api/v2/tenant-device',{token:new URL(invite.url).searchParams.get('token'),roomNumber:'A101'})
 const page=await tenant.newPage()
 await page.addInitScript(()=>{window.__auditPrintCalls=0;window.print=()=>{window.__auditPrintCalls++}})
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/my')
 await page.getByText('รอเจ้าของอนุมัติ').waitFor()
 const requests=await (await owner.request.get('/api/v2/requests?propertyId='+property)).json()
 const request=requests.items.find(x=>x.unit_id===unit&&x.status==='pending')
 assert.ok(request)
 const approval=await owner.request.post('/api/v2/approve',{data:{propertyId:property,unitId:unit,requestId:request.id},headers:{origin:base}})
 assert.equal(approval.status(),200)
 await page.reload()
 const nav=page.getByRole('navigation',{name:'เมนูผู้เช่า'})
 await nav.waitFor()
 const sections=[['billing','บิลของฉัน'],['repairs','แจ้งซ่อม'],['parcels','พัสดุ'],['announcements','ประกาศ'],['vehicles','รถของห้อง'],['documents','เอกสาร']]
 assert.equal(await nav.getByRole('link').count(),6)
 for(const [key,label] of sections){
  if(key==='billing')await page.route('**/api/v2/my-stays?*',async route=>{await new Promise(resolve=>setTimeout(resolve,500));await route.continue()})
  await nav.getByRole('link',{name:label,exact:true}).click()
  if(key==='billing'){
   await page.getByText('กำลังโหลด...').waitFor()
   await page.unroute('**/api/v2/my-stays?*')
  }
  await page.getByRole('heading',{name:label,exact:true}).waitFor()
  assert.equal(await page.locator('nav[aria-label="เมนูผู้เช่า"] a[aria-current="page"]').textContent(),label)
  for(const width of [360,390,768,1280,1920]){
   await page.setViewportSize({width,height:844})
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${key} ${width}: overflow`)
   const clipped=await page.locator('h1,h2,form button').evaluateAll(nodes=>nodes.filter(x=>x.getBoundingClientRect().width>0&&x.scrollWidth>x.clientWidth+2).map(x=>x.textContent?.trim()))
   assert.deepEqual(clipped,[],`${key} ${width}: clipped heading or button`)
  }
  await page.setViewportSize({width:390,height:844})
  if(key==='billing'){
   await page.getByText('ยังไม่มีรายการ').waitFor()
   assert.equal(await page.getByRole('button',{name:'ก่อนหน้า'}).isDisabled(),true)
   assert.equal(await page.getByRole('button',{name:'ถัดไป'}).isDisabled(),true)
  }
  if(['parcels','announcements'].includes(key))await page.getByText('ยังไม่มีรายการ').waitFor()
  if(key==='repairs'){
   await page.getByLabel('เรื่องที่ต้องซ่อม').fill('ก๊อกน้ำทดสอบ')
   await page.getByLabel('รายละเอียด').fill('ตรวจรอยรั่ว')
   await page.getByRole('button',{name:'ส่งคำขอ'}).click()
   await page.getByRole('status').getByText('บันทึกสำเร็จ').waitFor()
  }
  if(key==='vehicles'){
   await page.getByLabel('ทะเบียนรถ').fill('กข-1234')
   await page.getByLabel('ประเภทรถ').fill('รถยนต์')
   await page.getByRole('button',{name:'ส่งคำขอ'}).click()
   await page.getByRole('status').getByText('บันทึกสำเร็จ').waitFor()
  }
  if(key==='documents'){
   await page.getByRole('button',{name:'เปิดสัญญา'}).click()
   await page.getByRole('button',{name:'พิมพ์ / บันทึก PDF'}).waitFor()
   const pdf=await PDFDocument.load(await page.pdf({format:'A4',printBackground:true}))
   assert.ok(pdf.getPageCount()>=1)
   await page.getByRole('button',{name:'พิมพ์ / บันทึก PDF'}).click()
   assert.equal(await page.evaluate(()=>window.__auditPrintCalls),1)
   await page.getByRole('button',{name:'ปิด',exact:true}).click()
  }
  console.log(`PASS tenant ${key}: approved menu, controls and five widths`)
 }
 await page.goto(`/my/documents?propertyId=${crypto.randomUUID()}&unitId=${unit}`)
 await page.getByRole('alert').getByText('ไม่พบสิทธิ์ห้องนี้').waitFor()
 assert.deepEqual(errors,[])
 console.log('PASS tenant pending/approved, empty, error, repair/vehicle writes, contract PDF and isolation UI')
}finally{await owner.close();await tenant.close();await browser.close()}
