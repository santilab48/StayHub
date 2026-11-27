import assert from 'node:assert/strict'
import {randomBytes,createHash} from 'node:crypto'
import {chromium} from 'playwright'
import pg from 'pg'
const base=process.env.P26_E2E_BASE,db=process.env.DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||!db||new URL(db).hostname!=='127.0.0.1'||new URL(db).pathname!=='/stayhub_p26_ci')throw Error('Isolated CI only')
const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
const ctx=await browser.newContext({baseURL:base,serviceWorkers:'block'})
const sql=new pg.Client({connectionString:db})
const unique=randomBytes(6).toString('hex')
async function post(path,data){const r=await ctx.request.post(path,{data,headers:{origin:base}});const j=await r.json();assert.equal(r.status(),201,path+' '+JSON.stringify(j));return j}
try{
 await sql.connect()
 await post('/api/v2/register',{email:'billing-'+unique+'@example.invalid',password:'Ci-only-billing-1234!'})
 const propertyId=(await post('/api/v2/property',{name:'CI Billing '+unique,type:'apartment'})).id
 const unitId=(await post('/api/v2/unit',{propertyId,name:'CI-Billing-101'})).id
 const period=new Date(Date.now()+7*3600000).toISOString().slice(0,7)
 const date=period+'-01'
 const ends=String(Number(period.slice(0,4))+1)+period.slice(4)+'-01'
 const c=await post('/api/v2/room-contracts',{unitId,signedAt:date,startsOn:date,endsOn:ends,landlord:'CI owner',landlordAddress:'CI address',landlordPhone:'',tenant:'CI tenant',tenantAddress:'CI address',tenantPhone:'',propertyAddress:'CI property',rent:'4000',deposit:'0',advance:'0',water:'10',electric:'4',service:'100',dueDay:'5',inventory:'',terms:'',waterMeter:'100',electricMeter:'200'})
 const page=await ctx.newPage()
 page.setDefaultTimeout(25000)
 await page.goto('/cloud/billing')
 for(const width of [360,390,1280]){
  await page.setViewportSize({width,height:850})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,`billing layout overflow at ${width}px`)
 }
 await page.getByRole('combobox').first().selectOption(c.id)
 const water=page.locator('form').first().locator('.card.section').filter({has:page.getByRole('heading',{name:'ค่าน้ำ',exact:true})})
 const electric=page.locator('form').first().locator('.card.section').filter({has:page.getByRole('heading',{name:'ค่าไฟ',exact:true})})
 await water.getByLabel('เลขมิเตอร์ใหม่').fill('110')
 await water.getByRole('button',{name:'บันทึกมิเตอร์น้ำ',exact:true}).click()
 await page.getByRole('heading',{name:'ค่าน้ำ · บันทึกแล้ว',exact:true}).waitFor()
 await electric.getByLabel('เลขมิเตอร์ใหม่').fill('225')
 await electric.getByRole('button',{name:'บันทึกมิเตอร์ไฟ',exact:true}).click()
 await page.getByRole('heading',{name:'ค่าไฟ · บันทึกแล้ว',exact:true}).waitFor()
 await page.getByLabel('ค่าอื่น ๆ (บาท)',{exact:true}).fill('50')
 await page.getByRole('button',{name:'ตรวจสอบยอดก่อนออกบิล'}).click()
 await page.getByText('4,350.00 บาท',{exact:true}).waitFor()
 await sql.query(`CREATE FUNCTION stayhub.ci_reject_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
   BEGIN RAISE EXCEPTION 'CI invoice storage failure'; END $$`)
 await sql.query(`CREATE TRIGGER ci_invoice_storage_failure BEFORE INSERT ON stayhub.billing_invoice_documents
   FOR EACH ROW EXECUTE FUNCTION stayhub.ci_reject_invoice()`)
 await page.getByRole('button',{name:'ยืนยันออกบิล'}).click()
 await page.getByText('บริการบิลไม่พร้อมใช้งาน กรุณาลองใหม่',{exact:true}).first().waitFor()
 assert.equal((await sql.query('SELECT count(*)::int AS n FROM stayhub.billing_bills WHERE property_id=$1',[propertyId])).rows[0].n,0)
 assert.equal((await sql.query('SELECT count(*)::int AS n FROM stayhub.billing_meter_readings WHERE property_id=$1',[propertyId])).rows[0].n,2)
 await sql.query('DROP TRIGGER ci_invoice_storage_failure ON stayhub.billing_invoice_documents')
 await sql.query('DROP FUNCTION stayhub.ci_reject_invoice()')
 console.log('PASS invoice storage failure rolls back bill and retains saved meters')
 await page.getByRole('button',{name:'ยืนยันออกบิล'}).click()
 await page.locator('#bill-detail').waitFor()
 const result=await sql.query('SELECT id,total,status FROM stayhub.billing_bills WHERE property_id=$1 AND room_contract_id=$2',[propertyId,c.id])
 assert.equal(result.rowCount,1);assert.equal(result.rows[0].total,'4350.00')
 const bill=result.rows[0].id
 const docs=await sql.query('SELECT pdf,sha256,recipient_account_id FROM stayhub.billing_invoice_documents WHERE property_id=$1 AND bill_id=$2',[propertyId,bill])
 assert.equal(docs.rowCount,1)
 assert.equal(docs.rows[0].recipient_account_id,null,'unverified room contract has no tenant recipient')
 assert.equal(createHash('sha256').update(docs.rows[0].pdf).digest('hex'),docs.rows[0].sha256)
 const pdfPath='/api/v2/bills/'+bill+'/pdf?propertyId='+propertyId
 const ownerPdf=await ctx.request.get(pdfPath)
 assert.equal(ownerPdf.status(),200)
 assert.equal((await ownerPdf.body()).subarray(0,4).toString(),'%PDF')
 const other=await browser.newContext({baseURL:base,serviceWorkers:'block'})
 try{
  await other.request.post('/api/v2/register',{data:{email:'invoice-other-'+unique+'@example.invalid',password:'Ci-only-billing-1234!'},headers:{origin:base}})
  assert.equal((await other.request.get(pdfPath)).status(),404,'unverified tenant cannot read room contract bill')
 }finally{await other.close()}
 assert.equal((await sql.query('SELECT count(*)::int AS n FROM stayhub.billing_invoice_documents WHERE bill_id=$1',[bill])).rows[0].n,1)
 const readings=await sql.query('SELECT count(*)::int AS n FROM stayhub.billing_meter_readings WHERE property_id=$1 AND unit_id=$2',[propertyId,unitId]);assert.equal(readings.rows[0].n,2)
 console.log('PASS room contract, meter inputs, preview, actual bill button and PostgreSQL totals')
 await page.getByLabel('จำนวนเงิน (บาท)',{exact:true}).fill('1000')
 await page.getByRole('button',{name:'ยืนยันรับเงิน'}).click()
 await page.getByText('ชำระบางส่วน',{exact:false}).first().waitFor()
 await page.waitForFunction(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent?.trim()==='ยืนยันรับเงิน');return b&&!b.disabled})
 await page.getByLabel('จำนวนเงิน (บาท)',{exact:true}).fill('3350')
 await page.getByRole('button',{name:'ยืนยันรับเงิน'}).click()
 await page.locator('#bill-detail').getByText('ชำระครบ',{exact:false}).first().waitFor()
 await page.getByRole('link',{name:'ดูใบเสร็จ',exact:true}).click()
 await page.getByRole('heading',{name:'ใบรับชำระเงิน'}).waitFor()
 const paid=await sql.query('SELECT status FROM stayhub.billing_bills WHERE id=$1',[bill]);assert.equal(paid.rows[0].status,'paid')
 console.log('PASS partial and full payment from UI, paid receipt')
}finally{await sql.end();await ctx.close();await browser.close()}
