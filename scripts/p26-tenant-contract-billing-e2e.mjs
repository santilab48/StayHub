#!/usr/bin/env node
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import pg from 'pg'

const base=process.env.P26_E2E_BASE,db=process.env.DATABASE_URL
if(process.env.CI!=='true'||base!=='http://127.0.0.1:3000'||!db||new URL(db).hostname!=='127.0.0.1'||new URL(db).pathname!=='/stayhub_p26_ci')throw Error('Isolated CI only')
const tag=randomBytes(6).toString('hex'),sql=new pg.Client({connectionString:db})
async function call(path,cookie,body,headers={}){
 const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(cookie?{cookie}:{}),...(body?{'content-type':'application/json',origin:base}:{}),...headers},body:body?JSON.stringify(body):undefined})
 return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():await r.arrayBuffer(),cookie:r.headers.get('set-cookie')?.split(';')[0]}
}
const post=(path,body,cookie,headers)=>call(path,cookie,body,headers)
const ok=(r,status,label)=>{assert.equal(r.status,status,`${label}: ${JSON.stringify(r.data)}`);return r.data}
try{
 await sql.connect()
 const owner=await post('/api/v2/register',{email:`contract-${tag}@example.invalid`,password:'CI-contract-123456'})
 ok(owner,201,'owner');const oc=owner.cookie
 const propertyId=ok(await post('/api/v2/property',{name:'CI Contract '+tag,type:'apartment'},oc),201,'property').id
 const unitId=ok(await post('/api/v2/unit',{propertyId,name:'A101'},oc),201,'room').id
 const otherUnit=ok(await post('/api/v2/unit',{propertyId,name:'B202'},oc),201,'other room').id
 const date=new Date(Date.now()+7*3600000).toISOString().slice(0,7)+'-01'
 const ends=String(Number(date.slice(0,4))+1)+date.slice(4)
 const contract=ok(await post('/api/v2/room-contracts',{unitId,signedAt:date,startsOn:date,endsOn:ends,landlord:'CI owner',landlordAddress:'CI address',landlordPhone:'',tenant:'CI A101',tenantAddress:'CI address',tenantPhone:'',propertyAddress:'CI property',rent:'16000',deposit:'0',advance:'0',water:'0',electric:'0',service:'100',dueDay:'5',inventory:'',terms:''},oc),201,'contract')
 const bill=ok(await post('/api/v2/bills',{propertyId,roomContractId:contract.id,period:date.slice(0,7)},oc,{'idempotency-key':'contract-'+tag}),201,'bill before device')
 assert.equal(bill.total,'16100.00')
 const invoiceBefore=await sql.query('SELECT sha256 FROM stayhub.billing_invoice_documents WHERE bill_id=$1',[bill.id])
 const invite=ok(await post('/api/v2/create-invite',{propertyId,unitId},oc),201,'QR')
 const token=new URL(invite.url).searchParams.get('token')
 const device=await post('/api/v2/tenant-device',{token,roomNumber:'A101'})
 ok(device,201,'device');const dc=device.cookie
 const request=ok(await call('/api/v2/requests?propertyId='+propertyId,oc),200,'owner requests').items.find(x=>x.unit_id===unitId)
 assert.ok(request)
 assert.equal((await call('/api/v2/bills?tenant=1&propertyId='+propertyId,dc)).status,401,'pending cannot read bills')
 ok(await post('/api/v2/approve',{propertyId,unitId,requestId:request.id},oc),200,'approve')
 const mapped=await sql.query('SELECT room_contract_id FROM stayhub.tenant_contract_access WHERE property_id=$1 AND account_id=(SELECT account_id FROM stayhub.join_requests WHERE id=$2)',[propertyId,request.id])
 assert.equal(mapped.rows[0]?.room_contract_id,contract.id)
 const list=ok(await call('/api/v2/bills?tenant=1&propertyId='+propertyId,dc),200,'bill list')
 assert.equal(list.items.length,1);assert.equal(list.items[0].total,'16100.00')
 ok(await call('/api/v2/bills/'+bill.id+'?tenant=1&propertyId='+propertyId,dc),200,'bill detail')
 ok(await call('/api/v2/bills/'+bill.id+'/payments?tenant=1&propertyId='+propertyId,dc),200,'receipt balance')
 const pdf=await call('/api/v2/bills/'+bill.id+'/pdf?tenant=1&propertyId='+propertyId,dc)
 assert.equal(pdf.status,200);assert.equal(Buffer.from(pdf.data).subarray(0,4).toString(),'%PDF')
 const docs=ok(await call('/api/v2/tenant-contracts?tenant=1&propertyId='+propertyId+'&unitId='+unitId,dc),200,'tenant contract')
 assert.equal(docs.items[0].snapshot.tenant,'CI A101')
 assert.equal((await call('/api/v2/tenant-contracts?tenant=1&propertyId='+propertyId+'&unitId='+otherUnit,dc)).data.items.length,0)
 const stranger=await post('/api/v2/register',{email:`stranger-${tag}@example.invalid`,password:'CI-contract-123456'})
 ok(stranger,201,'stranger');const sc=stranger.cookie
 for(const path of ['/api/v2/bills?propertyId='+propertyId,'/api/v2/bills/'+bill.id+'?propertyId='+propertyId,'/api/v2/bills/'+bill.id+'/pdf?propertyId='+propertyId,'/api/v2/bills/'+bill.id+'/payments?propertyId='+propertyId]){
  const r=await call(path,sc);assert.equal(path.includes('/bills?')?r.data.items.length:r.status,path.includes('/bills?')?0:404,'stranger denied '+path)
 }
 assert.equal((await call('/api/v2/tenant-contracts?propertyId='+propertyId+'&unitId='+unitId,sc)).status,401)
 const reusedUnit=ok(await post('/api/v2/unit',{propertyId,name:'C303'},oc),201,'reused room').id
 const previousAccount=(await sql.query('SELECT id FROM stayhub.accounts WHERE email=$1',[`stranger-${tag}@example.invalid`])).rows[0].id
 await sql.query(`INSERT INTO stayhub.stays(property_id,unit_id,account_id,starts_at,ends_at)
   VALUES($1,$2,$3,now()-interval '2 months',now()-interval '1 month')`,[propertyId,reusedUnit,previousAccount])
 const oldContract=ok(await post('/api/v2/room-contracts',{unitId:reusedUnit,signedAt:date,startsOn:date,endsOn:ends,landlord:'CI owner',landlordAddress:'CI address',landlordPhone:'',tenant:'Old tenant',tenantAddress:'CI address',tenantPhone:'',propertyAddress:'CI property',rent:'1000',deposit:'0',advance:'0',water:'0',electric:'0',service:'0',dueDay:'5',inventory:'',terms:''},oc),201,'old contract')
 const oldBill=ok(await post('/api/v2/bills',{propertyId,roomContractId:oldContract.id,period:date.slice(0,7)},oc,{'idempotency-key':'reused-'+tag}),201,'old tenant bill')
 const reusedInvite=ok(await post('/api/v2/create-invite',{propertyId,unitId:reusedUnit},oc),201,'reused QR')
 const reusedDevice=await post('/api/v2/tenant-device',{token:new URL(reusedInvite.url).searchParams.get('token'),roomNumber:'C303'})
 ok(reusedDevice,201,'new tenant device')
 const reusedRequests=ok(await call('/api/v2/requests?propertyId='+propertyId,oc),200,'reused requests')
 const reusedRequest=reusedRequests.items.find(x=>x.unit_id===reusedUnit&&x.status==='pending')
 ok(await post('/api/v2/approve',{propertyId,unitId:reusedUnit,requestId:reusedRequest.id},oc),200,'approve reused room')
 assert.equal((await call('/api/v2/bills?tenant=1&propertyId='+propertyId+'&unitId='+reusedUnit,reusedDevice.cookie)).data.items.length,0,'new tenant cannot see old bill')
 assert.equal((await call('/api/v2/bills/'+oldBill.id+'/pdf?tenant=1&propertyId='+propertyId,reusedDevice.cookie)).status,404,'new tenant cannot read old PDF')
 assert.equal((await call('/api/v2/tenant-contracts?propertyId='+propertyId+'&unitId='+reusedUnit,reusedDevice.cookie)).data.items.length,0,'new tenant cannot see old contract')
 const invoiceAfter=await sql.query('SELECT sha256 FROM stayhub.billing_invoice_documents WHERE bill_id=$1',[bill.id])
 assert.equal(invoiceAfter.rows[0].sha256,invoiceBefore.rows[0].sha256,'original PDF unchanged')
 const unchanged=await sql.query('SELECT account_id,total FROM stayhub.billing_bills WHERE id=$1',[bill.id])
 assert.equal(unchanged.rows[0].account_id,null);assert.equal(unchanged.rows[0].total,'16100.00')
 const deviceRow=await sql.query('SELECT id FROM stayhub.tenant_devices WHERE join_request_id=$1',[request.id])
 ok(await post('/api/v2/revoke-tenant-device',{propertyId,deviceId:deviceRow.rows[0].id},oc),200,'revoke')
 assert.equal((await call('/api/v2/bills?tenant=1&propertyId='+propertyId,dc)).status,401)
 assert.equal((await call('/api/v2/tenant-contracts?tenant=1&propertyId='+propertyId+'&unitId='+unitId,dc)).status,401)
 console.log('PASS contract bill 16100, original PDF unchanged, list/detail/PDF/receipt/contract isolation, previous-tenant protection, revoke')
}finally{await sql.end()}
