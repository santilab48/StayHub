#!/usr/bin/env node
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import pg from 'pg'
const base=process.env.P26_E2E_BASE,db=process.env.DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||
 !db||new URL(db).hostname!=='127.0.0.1'||new URL(db).pathname!=='/stayhub_p26_ci')
 throw Error('Isolated CI only')
const tag=randomBytes(6).toString('hex')
const sql=new pg.Client({connectionString:db})
async function call(path,{method='GET',cookie,body}={}){
 const headers={};if(cookie)headers.cookie=cookie
 if(body){headers.origin=base;headers['content-type']='application/json'}
 const r=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined})
 return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}
}
const post=(path,body,cookie)=>call(path,{method:'POST',body,cookie})
function expect(r,status,label){assert.equal(r.status,status,`${label}: ${JSON.stringify(r.data)}`);return r.data}
try{
 await sql.connect()
 const owner=await post('/api/v2/register',{email:`device-owner-${tag}@example.invalid`,password:'CI-device-only-123456'})
 expect(owner,201,'owner register')
 const ownerCookie=owner.cookie
 const prop=expect(await post('/api/v2/property',{name:'CI device '+tag,type:'apartment'},ownerCookie),201,'property').id
 const unit=expect(await post('/api/v2/unit',{propertyId:prop,name:'A101'},ownerCookie),201,'room').id
 const otherUnit=expect(await post('/api/v2/unit',{propertyId:prop,name:'B202'},ownerCookie),201,'other room').id
 const invitation=expect(await post('/api/v2/create-invite',{propertyId:prop,unitId:unit},ownerCookie),201,'QR')
 const token=new URL(invitation.url).searchParams.get('token')
 assert.equal(invitation.url.startsWith('https://stayhub-fsd-staging.up.railway.app/join?token='),true)
 const manifest=expect(await call('/api/v2/tenant-manifest?token='+token),200,'tenant install manifest')
 assert.equal(manifest.start_url,'/join?token='+token)
 const before=(await sql.query('SELECT count(*)::int AS n FROM stayhub.tenant_devices')).rows[0].n
 expect(await post('/api/v2/tenant-device',{token,roomNumber:'B202'}),409,'wrong room denied')
 assert.equal((await sql.query('SELECT count(*)::int AS n FROM stayhub.tenant_devices')).rows[0].n,before)
 const device=await post('/api/v2/tenant-device',{token,roomNumber:'A101'})
 expect(device,201,'device requests room');assert.match(device.cookie,/^stayhub_tenant_device=/)
 const dc=device.cookie
 assert.equal(expect(await call('/api/v2/tenant-device',{cookie:dc}),200,'pending status').status,'pending')
 expect(await call('/api/v2/my-stays',{cookie:dc}),401,'private stay denied before approval')
 expect(await call('/api/v2/bills',{cookie:dc}),401,'bills denied before approval')
 expect(await post('/api/v2/tenant-device',{token,roomNumber:'A101'},dc),200,'duplicate request idempotent')
 const rows=await sql.query(`SELECT d.id,d.token_hash,a.email,a.password_hash FROM stayhub.tenant_devices d
  JOIN stayhub.accounts a ON a.id=d.account_id WHERE d.property_id=$1`,[prop])
 assert.equal(rows.rowCount,1);assert.match(rows.rows[0].token_hash,/^[0-9a-f]{64}$/)
 assert.equal(rows.rows[0].password_hash,null)
 const requests=expect(await call('/api/v2/requests?propertyId='+prop,{cookie:ownerCookie}),200,'owner sees request')
 const request=requests.items.find(x=>x.device_id===rows.rows[0].id)
 assert.ok(request);assert.equal(request.unit_name,'A101');assert.equal(request.email,'ผู้เช่าจากอุปกรณ์')
 expect(await post('/api/v2/approve',{propertyId:prop,requestId:request.id,unitId:unit},ownerCookie),200,'owner approves')
 assert.equal(expect(await call('/api/v2/tenant-device',{cookie:dc}),200,'approved status').status,'approved')
 const stays=expect(await call('/api/v2/my-stays',{cookie:dc}),200,'tenant dashboard')
 assert.equal(stays.items.length,1);assert.equal(stays.items[0].unit_id,unit)
 expect(await call('/api/v2/operations?propertyId='+prop+'&kind=announcements',{cookie:dc}),200,'approved tenant announcements')
 expect(await call('/api/v2/operations?propertyId='+prop+'&kind=parcels',{cookie:dc}),200,'approved tenant parcels')
 expect(await post('/api/v2/operations',{propertyId:prop,action:'parcel-add',unitId:otherUnit,carrier:'CI other-room parcel'},ownerCookie),201,'owner creates other-room parcel')
 const parcels=expect(await call('/api/v2/operations?propertyId='+prop+'&kind=parcels',{cookie:dc}),200,'tenant parcel isolation')
 assert.equal(parcels.items.some(x=>x.unit_id===otherUnit),false)
 expect(await call('/api/v2/repairs?propertyId='+prop,{cookie:dc}),200,'approved tenant repairs')
 const lease=expect(await post('/api/v2/leases',{action:'create',propertyId:prop,stayId:stays.items[0].id,
  startsOn:'2026-11-01',monthlyRent:4000,securityDeposit:0},ownerCookie),201,'lease for approved device').id
 const issued=await fetch(base+'/api/v2/bills',{method:'POST',headers:{cookie:ownerCookie,origin:base,
  'content-type':'application/json','idempotency-key':'tenant-device-'+tag},body:JSON.stringify({propertyId:prop,leaseId:lease,period:'2026-11'})})
 const bill=await issued.json();assert.equal(issued.status,201,JSON.stringify(bill))
 expect(await call('/api/v2/bills?propertyId='+prop,{cookie:dc}),200,'approved tenant bill list')
 const tenantPdf=await fetch(base+'/api/v2/bills/'+bill.id+'/pdf?propertyId='+prop,{headers:{cookie:dc}})
 assert.equal(tenantPdf.status,200,'approved tenant invoice PDF')
 assert.equal(tenantPdf.headers.get('content-type'),'application/pdf')
 expect(await post('/api/v2/property',{name:'Tenant must not own',type:'apartment'},dc),409,'device cannot create owner property')
 const other=await post('/api/v2/register',{email:`other-owner-${tag}@example.invalid`,password:'CI-device-only-123456'})
 expect(other,201,'second owner')
 const otherProp=expect(await post('/api/v2/property',{name:'CI other '+tag,type:'apartment'},other.cookie),201,'second property').id
 expect(await call('/api/v2/units?propertyId='+otherProp,{cookie:dc}),403,'cross-property room denied')
 expect(await call('/api/v2/operations?propertyId='+otherProp+'&kind=parcels',{cookie:dc}),403,'cross-property parcel denied')
 const otherPdf=await fetch(base+'/api/v2/bills/'+bill.id+'/pdf?propertyId='+otherProp,{headers:{cookie:dc}})
 assert.equal(otherPdf.status,404,'cross-property invoice denied')
 expect(await post('/api/v2/revoke-tenant-device',{propertyId:prop,deviceId:rows.rows[0].id},other.cookie),403,'other owner cannot revoke')
 expect(await post('/api/v2/revoke-tenant-device',{propertyId:prop,deviceId:rows.rows[0].id},ownerCookie),200,'owner revokes')
 assert.equal(expect(await call('/api/v2/tenant-device',{cookie:dc}),200,'revoked status').status,'revoked')
 expect(await call('/api/v2/my-stays',{cookie:dc}),401,'revoked device denied')
 assert.equal((await fetch(base+'/api/v2/bills/'+bill.id+'/pdf?propertyId='+prop,{headers:{cookie:dc}})).status,401,'revoked invoice denied')
 const second=await post('/api/v2/tenant-device',{token,roomNumber:'A101'})
 expect(second,201,'second device requests room')
 const secondRequests=expect(await call('/api/v2/requests?propertyId='+prop,{cookie:ownerCookie}),200,'owner sees second request')
 const pendingSecond=secondRequests.items.find(x=>x.status==='pending'&&x.device_id)
 assert.ok(pendingSecond)
 expect(await post('/api/v2/reject',{propertyId:prop,requestId:pendingSecond.id},ownerCookie),200,'owner rejects second device')
 assert.equal(expect(await call('/api/v2/tenant-device',{cookie:second.cookie}),200,'rejected status').status,'rejected')
 expect(await call('/api/v2/my-stays',{cookie:second.cookie}),401,'rejected device denied')
 console.log('PASS QR, manifest handoff, wrong-room denial, pending isolation, owner approval, dashboard, cross-property isolation, owner-only revocation')
}finally{await sql.end()}
