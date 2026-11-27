#!/usr/bin/env node
// STAGING-ONLY synthetic operational E2E. Never execute against production.
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
const base='https://stayhub-fsd-staging.up.railway.app'
if(process.env.CI!=='true'||process.env.STAYHUB_OPS_TEST_BASE!==base)throw Error('REFUSED: approved isolated staging only')
const tag=randomBytes(8).toString('hex')
const email=n=>'ops-'+tag+'-'+n+'@example.invalid'
const password='Staging-Only-Demo-Not-For-Users-123!'
async function call(path,{method='GET',body,cookie,headers={}}={}){
 const h={...headers}
 if(body!==undefined){h.origin=base;h['content-type']='application/json'}
 if(cookie)h.cookie=cookie
 const r=await fetch(base+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'})
 const json=await r.json().catch(()=>null)
 return {status:r.status,data:json,cookie:r.headers.get('set-cookie')?.split(';')[0]}
}
function expect(result,status,label){
 assert.equal(result.status,status,label+': '+result.status+' '+JSON.stringify(result.data))
 console.log('PASS',label)
 return result.data
}
async function register(name){
 const r=await call('/api/v2/register',{method:'POST',body:{email:email(name),password}})
 expect(r,201,'register '+name)
 assert.ok(r.cookie?.startsWith('stayhub_session='))
 return r.cookie
}
const post=(action,propertyId,cookie,other={})=>call('/api/v2/operations',{method:'POST',cookie,body:{action,propertyId,...other}})
const list=(kind,propertyId,cookie)=>call('/api/v2/operations?kind='+kind+'&propertyId='+propertyId,{cookie})
const owner=await register('owner')
const resident=await register('resident')
const outsider=await register('outsider')
const prop=expect(await call('/api/v2/property',{method:'POST',cookie:owner,body:{name:'Ops fixture '+tag,type:'apartment'}}),201,'create property').id
const unit=expect(await call('/api/v2/unit',{method:'POST',cookie:owner,body:{propertyId:prop,name:'OP-101'}}),201,'create unit').id
expect(await call('/api/health/db'),200,'migrations and readiness')
expect(await list('settings',prop,outsider),403,'other account denied')
expect(await post('settings-save',prop,resident,{waterRate:10,electricRate:5,dueDay:5,lateFee:0}),403,'resident denied settings')
expect(await post('settings-save',prop,owner,{waterRate:10,electricRate:5,dueDay:5,lateFee:0}),201,'owner saves settings')
const saved=expect(await list('settings',prop,owner),200,'owner reads settings')
assert.equal(Number(saved.items[0].water_rate),10)
expect(await post('announcement-add',prop,owner,{title:'ทดสอบประกาศ',body:'Staging only',unitId:null,pinned:true}),201,'owner creates notice')
expect(await post('parcel-add',prop,owner,{unitId:unit,carrier:'Staging Test Carrier',tracking:'CI-'+tag}),201,'owner receives parcel')
expect(await post('vehicle-add',prop,owner,{unitId:unit,plate:'STAGING-'+tag,vehicleType:'car'}),201,'owner adds vehicle')
expect(await post('driver-add',prop,owner,{name:'Test Driver',phone:'0000000000',vehicleType:'car'}),201,'owner adds driver')
expect(await post('document-add',prop,owner,{unitId:unit,title:'กฎตัวอย่าง',description:'ข้อมูลทดสอบเท่านั้น'}),201,'owner publishes room note')
expect(await list('announcements',prop,outsider),403,'other account denied announcements')
const invited=expect(await call('/api/v2/create-invite',{method:'POST',cookie:owner,body:{propertyId:prop,unitId:unit}}),201,'create QR')
const token=new URL(invited.url).searchParams.get('token')
expect(await call('/api/v2/join',{method:'POST',cookie:resident,body:{token}}),201,'join property')
const requests=expect(await call('/api/v2/requests?propertyId='+prop,{cookie:owner}),200,'pending requests')
const request=requests.items.find(i=>i.status==='pending')
assert.ok(request?.id)
expect(await call('/api/v2/approve',{method:'POST',cookie:owner,body:{propertyId:prop,requestId:request.id,unitId:unit}}),200,'approve resident')
const announcements=expect(await list('announcements',prop,resident),200,'resident views notices')
assert.ok(announcements.items.some(x=>x.title==='ทดสอบประกาศ'))
const parcels=expect(await list('parcels',prop,resident),200,'resident sees own parcel')
assert.ok(parcels.items.some(x=>x.tracking==='CI-'+tag))
expect(await post('parcel-status',prop,resident,{id:parcels.items[0].id,status:'picked_up'}),403,'resident denied parcel approval')
expect(await post('parcel-status',prop,owner,{id:parcels.items[0].id,status:'picked_up'}),201,'owner confirms parcel')
expect(await post('vehicle-add',prop,resident,{unitId:unit,plate:'TENANT-'+tag,vehicleType:'motorcycle'}),201,'resident requests vehicle')
const vehicles=expect(await list('vehicles',prop,owner),200,'owner lists vehicles')
const pending=vehicles.items.find(x=>x.plate==='TENANT-'+tag)
assert.equal(pending?.status,'pending')
expect(await post('vehicle-review',prop,resident,{id:pending.id,status:'approved'}),403,'resident denied vehicle approval')
expect(await post('vehicle-review',prop,owner,{id:pending.id,status:'approved'}),201,'owner approves vehicle')
const driver=expect(await list('drivers',prop,resident),200,'resident sees active drivers')
assert.ok(driver.items.length)
expect(await post('ride-add',prop,resident,{unitId:unit,driverId:driver.items[0].id,note:'Staging test request'}),201,'resident requests ride')
const rides=expect(await list('rides',prop,owner),200,'owner sees rides')
const ride=rides.items.find(x=>x.note==='Staging test request')
assert.ok(ride)
expect(await post('ride-status',prop,resident,{id:ride.id,status:'accepted'}),403,'resident cannot accept ride')
expect(await post('ride-status',prop,owner,{id:ride.id,status:'completed'}),409,'ride cannot jump states')
expect(await post('ride-status',prop,owner,{id:ride.id,status:'accepted'}),201,'owner accepts ride')
expect(await post('ride-status',prop,owner,{id:ride.id,status:'on_the_way'}),201,'owner drives')
expect(await post('ride-status',prop,owner,{id:ride.id,status:'arrived'}),201,'owner arrives')
expect(await post('ride-status',prop,owner,{id:ride.id,status:'completed'}),201,'owner completes ride')
const docs=expect(await list('documents',prop,resident),200,'resident sees own room text document')
assert.ok(docs.items.some(x=>x.title==='กฎตัวอย่าง'))
expect(await list('drivers',prop,outsider),403,'out-of-property driver list blocked')
console.log('PASS OPERATIONS LIVE STAGING tenant isolation and CRUD (NO production writes)')
