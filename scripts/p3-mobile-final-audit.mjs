#!/usr/bin/env node
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdirSync,writeFileSync} from 'node:fs'
import {chromium} from 'playwright'
import pg from 'pg'

const base=process.env.P26_E2E_BASE,raw=process.env.DATABASE_URL,phase=process.env.P3_MOBILE_PHASE
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||!raw||new URL(raw).hostname!=='127.0.0.1'||new URL(raw).pathname!=='/stayhub_p26_ci'||!['before','after'].includes(phase))throw Error('Isolated mobile audit only')
const sizes=[[320,568],[360,800],[375,812],[390,844],[430,932]]
const out='docs/screenshots/mobile-final-audit'
mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,...(process.env.STAYHUB_CHROMIUM_PATH?{executablePath:process.env.STAYHUB_CHROMIUM_PATH}:{})})
const sql=new pg.Client({connectionString:raw})
const tag=randomBytes(5).toString('hex')
const findings=[]
const post=async(ctx,path,data)=>{const r=await ctx.request.post(path,{data,headers:{origin:base}});assert.equal(r.status(),201,`${path}: ${await r.text()}`);return r.json()}
const inspect=async(page,where,width)=>{
 const result=await page.evaluate(()=>{
  const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return s.visibility!=='hidden'&&s.display!=='none'&&r.width>0&&r.height>0&&r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight}
  const small=[...document.querySelectorAll('button')].filter(visible).map(e=>({text:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,45),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)})).filter(x=>x.width<44||x.height<44)
  const clipped=[...document.querySelectorAll('h1,h2,h3,button, .room strong')].filter(visible).filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>(e.textContent||'').trim().slice(0,45))
  return {overflow:document.documentElement.scrollWidth>innerWidth+1,small,clipped}
 })
 if(result.overflow||result.small.length||result.clipped.length)findings.push({where,width,...result})
}
try{
 await sql.connect()
 for(const type of ['apartment','guesthouse','daily','homestay']){
  const ctx=await browser.newContext({baseURL:base,viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  const email=`mobile-${type}-${tag}@example.invalid`
  await post(ctx,'/api/v2/register',{email,password:'CI-mobile-123456'})
  const property=(await post(ctx,'/api/v2/property',{name:`Mobile ${type}`,type})).id
  const owner=(await (await ctx.request.get('/api/v2/me')).json()).id
  const roomNames=['A101','A102','A103','A104','A105','ห้องพักหมายเลขยาวมากเพื่อทดสอบการตัดบรรทัด-1234567890']
  const units=[]
  for(const name of roomNames)units.push((await post(ctx,'/api/v2/unit',{propertyId:property,name})).id)
  await sql.query('UPDATE stayhub.units SET active=false WHERE id=$1 AND property_id=$2',[units[5],property])
  await sql.query("INSERT INTO stayhub.unit_blocks(property_id,unit_id,starts_at,ends_at,reason,created_by) VALUES($1,$2,now()-interval '1 day',now()+interval '2 days','maintenance',$3)",[property,units[3],owner])
  await sql.query("INSERT INTO stayhub.housekeeping_tasks(property_id,unit_id,status) VALUES($1,$2,'pending')",[property,units[4]])
  await sql.query("INSERT INTO stayhub.reservations(property_id,unit_id,arrival_date,departure_date,status) VALUES($1,$2,current_date,current_date+1,'confirmed')",[property,units[2]])
  await sql.query('INSERT INTO stayhub.stays(property_id,unit_id,account_id) VALUES($1,$2,$3)',[property,units[1],owner])
  const page=await ctx.newPage()
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  const adRequests=[];page.on('request',r=>{if(/googlesyndication|doubleclick|hilltop|shameful-farm/.test(r.url()))adRequests.push(r.url())})
  await page.goto(`/cloud?type=${type}`)
  const nav=page.locator('nav[aria-label^="หมวดจัดการ"]')
  await nav.waitFor()
  const roomGrid=page.locator('section[aria-label="สถานะห้องพัก"] [class*="grid"]')
  await roomGrid.waitFor()
  await page.locator('[data-ad-slot="bottom"][data-ad-mode="mock"]').waitFor()
  await page.evaluate(()=>{const dialog=document.createElement('div');dialog.setAttribute('role','dialog');dialog.id='p3-audit-dialog';document.body.append(dialog)})
  await page.locator('[data-ad-slot="bottom"]').waitFor({state:'detached'})
  await page.locator('#p3-audit-dialog').evaluate(e=>e.remove())
  await page.locator('[data-ad-slot="bottom"][data-ad-mode="mock"]').waitFor()
  assert.equal(await roomGrid.locator('[data-tone]').count(),6)
  const tones=await roomGrid.locator('[data-tone]').evaluateAll(es=>es.map(e=>({name:e.querySelector('strong')?.textContent,tone:e.getAttribute('data-tone'),label:e.querySelector('small')?.textContent})))
  assert.deepEqual(tones.map(x=>x.tone).sort(),['available','occupied','reserved','repair','cleaning','inactive'].sort())
  for(const [width,height] of sizes){
   await page.setViewportSize({width,height})
   await page.goto(`/cloud?type=${type}`)
   await roomGrid.waitFor()
   await page.locator('[data-ad-slot="bottom"][data-ad-mode="mock"]').waitFor()
   await inspect(page,`${type}:overview`,width)
   const cards=await roomGrid.locator('[data-tone]').evaluateAll(es=>es.slice(0,3).map(e=>Math.round(e.getBoundingClientRect().top)))
   if(new Set(cards).size!==1)findings.push({where:`${type}:overview`,width,issue:'first three room cards not on one row',cards})
   const bottom=page.locator('[data-ad-slot="bottom"]')
   if(await bottom.count()){const box=await bottom.boundingBox();if(box&&box.top<height&&box.bottom>0){const overlays=await page.evaluate(()=>{const ad=document.querySelector('[data-ad-slot="bottom"]')?.getBoundingClientRect();const btn=[...document.querySelectorAll('button')].map(x=>x.getBoundingClientRect());return ad?btn.some(r=>r.width&&r.height&&Math.max(0,Math.min(r.right,ad.right)-Math.max(r.left,ad.left))*Math.max(0,Math.min(r.bottom,ad.bottom)-Math.max(r.top,ad.top))>0):false});if(overlays)findings.push({where:`${type}:ad`,width,issue:'banner overlaps button'})}}
   if((width===320||width===390))await page.screenshot({path:`${out}/${phase}-${type}-${width}.png`,fullPage:true})
   for(const tab of await nav.locator('button').all()){
    await tab.click()
    await inspect(page,`${type}:${(await tab.textContent()).trim()}`,width)
   }
   await nav.locator('button').first().click()
  }
  await page.goto(`/cloud?type=${type}`)
  if(type!=='apartment'){
   await roomGrid.locator('[data-tone="available"]').click()
   assert.equal(await page.locator('#guesthouse-room-form input').first().inputValue(),'A101')
  }else{
   await roomGrid.locator('[data-tone="available"]').click()
   await page.waitForURL(new RegExp(`/cloud/rooms\\?unitId=${units[0]}`))
  }
  assert.deepEqual(errors,[],`${type} browser errors`)
  assert.deepEqual(adRequests,[],`${type} must use mock ads only`)
  console.log(`AUDITED ${type} mobile; room tones ${tones.map(x=>x.tone).join(',')}`)
  await ctx.close()
 }
}finally{await sql.end().catch(()=>{});await browser.close()}
writeFileSync(`${out}/${phase}-findings.json`,JSON.stringify(findings,null,2)+'\n')
console.log(`FINDINGS ${phase} ${findings.length}`)
for(const issue of findings.slice(0,30))console.log(JSON.stringify(issue))
