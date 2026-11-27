#!/usr/bin/env node
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {chromium} from 'playwright'

if(process.env.CI!=='true'||process.env.P26_E2E_BASE!=='http://127.0.0.1:3000')throw Error('Isolated CI only')
const base=process.env.P26_E2E_BASE,tag=randomBytes(5).toString('hex')
const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
const owner=await browser.newContext({baseURL:base}),tenant=await browser.newContext({baseURL:base,viewport:{width:390,height:844}})
async function post(ctx,path,data){const r=await ctx.request.post(path,{data,headers:{origin:base}});const j=await r.json();assert.equal(r.status(),201,path+' '+JSON.stringify(j));return j}
try{
 await post(owner,'/api/v2/register',{email:`ui-${tag}@example.invalid`,password:'CI-browser-123456'})
 const propertyId=(await post(owner,'/api/v2/property',{name:'CI UI '+tag,type:'apartment'})).id
 const unitId=(await post(owner,'/api/v2/unit',{propertyId,name:'A101'})).id
 const date=new Date(Date.now()+7*3600000).toISOString().slice(0,7)+'-01'
 const ends=String(Number(date.slice(0,4))+1)+date.slice(4)
 await post(owner,'/api/v2/room-contracts',{unitId,signedAt:date,startsOn:date,endsOn:ends,landlord:'Owner',landlordAddress:'Address',landlordPhone:'',tenant:'Tenant',tenantAddress:'Address',tenantPhone:'',propertyAddress:'Property',rent:'16000',deposit:'0',advance:'0',water:'0',electric:'0',service:'100',dueDay:'5',inventory:'',terms:''})
 const invitation=await post(owner,'/api/v2/create-invite',{propertyId,unitId})
 const token=new URL(invitation.url).searchParams.get('token')
 await post(tenant,'/api/v2/tenant-device',{token,roomNumber:'A101'})
 const requests=await (await owner.request.get('/api/v2/requests?propertyId='+propertyId)).json()
 const request=requests.items.find(x=>x.unit_id===unitId)
 const approval=await owner.request.post('/api/v2/approve',{data:{propertyId,unitId,requestId:request.id},headers:{origin:base}})
 assert.equal(approval.status(),200)
 const page=await tenant.newPage()
 await page.goto('/my')
 await page.locator('a[class*="tile"]').filter({hasText:'เอกสาร'}).waitFor()
 const tiles=page.locator('a[class*="tile"]')
 assert.equal(await tiles.count(),6)
 assert.deepEqual(await tiles.locator('strong').allTextContents(),['บิลของฉัน','แจ้งซ่อม','พัสดุ','ประกาศ','รถของห้อง','เอกสาร'])
 assert.equal(await page.getByRole('link',{name:/เรียกรถ/}).count(),0)
 for(const tile of await tiles.all()){
  const css=await tile.evaluate(el=>({background:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color,href:el.getAttribute('href')}))
  assert.match(css.background,/rgb\(255, 179, 107\)/)
  assert.match(css.background,/rgb\(255, 139, 67\)/)
  assert.equal(css.color,'rgb(40, 23, 12)')
  assert.ok(css.href.startsWith('/my/'))
 }
 await page.locator('a[class*="tile"]').filter({hasText:'เอกสาร'}).click()
 await page.getByRole('button',{name:'เปิดสัญญา'}).click()
 assert.equal(await page.locator('article').getByText('ข้อ 15',{exact:false}).count()>0,true)
 assert.equal(await page.getByRole('button',{name:'พิมพ์ / บันทึก PDF'}).count(),1)
 console.log('PASS 390px six orange tiles, links, original contract and print control')
}finally{await owner.close();await tenant.close();await browser.close()}
