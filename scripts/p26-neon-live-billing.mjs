#!/usr/bin/env node
// Live backend E2E: writes ONLY disposable synthetic data to the approved Railway staging app backed by Neon staging.
import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'
const BASE=process.env.P26_NEON_LIVE_E2E_BASE
if(process.env.CI!=='true'||BASE!=='https://stayhub-fsd-staging.up.railway.app')
  throw new Error('REFUSED: only CI and the approved StayHub Railway staging URL are allowed')
const tag=randomBytes(7).toString('hex')
// This test creates identifiable staging-only demo records; no production write is permitted.
const email=n=>`p26-neon-billing-${tag}-${n}@example.invalid`
const password='P26-neon-live-Only-1234!'
const request=async(path,{method='GET',body,cookie,extraHeaders={}}={})=>{
 const headers={...extraHeaders}
 if(body!==undefined){headers['content-type']='application/json';headers.origin=BASE}
 if(cookie)headers.cookie=cookie
 const response=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'})
 const json=await response.json().catch(()=>null)
 return {status:response.status,data:json,cookie:response.headers.get('set-cookie')?.split(';')[0]}
}
const expect=(r,status,label)=>{assert.equal(r.status,status,`${label}: HTTP ${r.status} ${JSON.stringify(r.data)}`);console.log('PASS',label,status);return r}
const register=async(name)=>{
 const r=expect(await request('/api/v2/register',{method:'POST',body:{email:email(name),password}}),201,'register '+name)
 assert.match(r.cookie||'',/^stayhub_session=/)
 expect(await request('/api/v2/me',{cookie:r.cookie}),200,'session '+name)
 return r.cookie
}
async function main(){
 const h=expect(await request('/api/health/db'),200,'isolated PostgreSQL readiness')
 assert.equal(h.data?.database,'ready')
 const anon=expect(await request('/api/v2/me'),401,'anonymous denied')
 assert.equal(anon.data?.error,'Please sign in')
 expect(await request('/api/v2/register',{method:'POST',body:{email:email('weak'),password:'123'}}),400,'weak registration password denied')
 const alice=await register('alice')
 const bob=await register('bob')
 const tenant=await register('tenant')
 expect(await request('/api/v2/login',{method:'POST',body:{email:email('alice'),password:'wrong'}}),401,'wrong credentials denied')
 const prop=expect(await request('/api/v2/property',{method:'POST',body:{name:'CI Test Property '+tag,type:'apartment'},cookie:alice}),201,'owner creates property').data.id
 assert.match(prop,/^[0-9a-f-]{36}$/)
 expect(await request('/api/v2/register',{method:'POST',body:{email:email('alice'),password}}),409,'duplicate account denied')
 const unit=expect(await request('/api/v2/unit',{method:'POST',body:{propertyId:prop,name:'CI-101'},cookie:alice}),201,'owner creates unit').data.id
 expect(await request('/api/v2/units?propertyId='+prop,{cookie:alice}),200,'owner lists units')
 expect(await request('/api/v2/units?propertyId='+prop,{cookie:bob}),403,'other owner denied units')
 expect(await request('/api/v2/leases?propertyId='+prop,{cookie:bob}),403,'other owner denied leases')
 expect(await request('/api/v2/meter-readings',{method:'POST',cookie:bob,body:{
  propertyId:prop,unitId:unit,meterType:'water',period:'2026-11',initialReading:'0',currentReading:'10',unitRate:'10'
 }}),403,'other owner denied meter write')
 expect(await request('/api/v2/bills',{method:'POST',cookie:bob,body:{
  propertyId:prop,leaseId:randomUUID(),period:'2026-11',otherAmount:'0.00'
 }}),400,'billing request without idempotency key rejected')
 const invite=expect(await request('/api/v2/create-invite',{method:'POST',cookie:alice,body:{propertyId:prop,unitId:unit}}),201,'owner creates invitation')
 assert.match(invite.data.url,/\/join\?token=/)
 const token=new URL(invite.data.url).searchParams.get('token')
 expect(await request('/api/v2/join',{method:'POST',cookie:tenant,body:{token}}),201,'tenant QR join request')
 const requests=expect(await request('/api/v2/requests?propertyId='+prop,{cookie:alice}),200,'owner views join requests')
 const item=requests.data.items.find(x=>x.status==='pending')
 assert.ok(item?.id)
 expect(await request('/api/v2/requests?propertyId='+prop,{cookie:bob}),403,'other owner denied join requests')
 expect(await request('/api/v2/approve',{method:'POST',cookie:alice,body:{
   propertyId:prop,requestId:item.id,unitId:unit
 }}),200,'owner approves tenant QR join')
 const stays=expect(await request('/api/v2/my-stays',{cookie:tenant}),200,'tenant sees approved stay')
 const stayId=stays.data.items.find(x=>x.unit_name==='CI-101')?.id
 assert.ok(stayId,'approved stay must be visible to tenant')
 const lease=expect(await request('/api/v2/leases',{method:'POST',cookie:alice,body:{
   action:'create',propertyId:prop,stayId,startsOn:'2026-11-01',monthlyRent:4000,securityDeposit:0
 }}),201,'owner issues active lease').data.id
 const reading=async(meterType,currentReading)=>{
   return expect(await request('/api/v2/meter-readings',{method:'POST',cookie:alice,body:{
     propertyId:prop,unitId:unit,period:'2026-11',meterType,initialReading:'0',
     currentReading,unitRate:'10'
   }}),201,'meter reading '+meterType)
 }
 await reading('water','10')
 await reading('electric','20')
 expect(await request('/api/v2/meter-readings',{method:'POST',cookie:alice,body:{propertyId:prop,unitId:unit,period:'2026-11',meterType:'water',initialReading:'0',currentReading:'10',unitRate:'10'}}),409,'duplicate monthly meter reading denied')
 const billKey='p26-bill-'+tag+'-nov'
 const billBody={propertyId:prop,leaseId:lease,period:'2026-11',otherAmount:'50.00',otherLabel:'CI other'}
 const bill=expect(await request('/api/v2/bills',{method:'POST',cookie:alice,
    extraHeaders:{'idempotency-key':billKey},body:billBody}),201,'issue monthly bill')
 assert.equal(bill.data.total,'4350.00')
 const billId=bill.data.id
 const replay=expect(await request('/api/v2/bills',{method:'POST',cookie:alice,
    extraHeaders:{'idempotency-key':billKey},body:billBody}),200,'replay same bill key')
 assert.equal(replay.data.id,billId)
 expect(await request('/api/v2/bills',{method:'POST',cookie:alice,extraHeaders:{'idempotency-key':billKey},body:{...billBody,otherAmount:'60.00'}}),409,'bill key reused with different payload denied')
 expect(await request('/api/v2/bills',{method:'POST',cookie:alice,extraHeaders:{'idempotency-key':'p26-duplicate-'+tag},body:billBody}),409,'duplicate monthly bill denied')
 expect(await request('/api/v2/bills/'+billId+'?propertyId='+prop,{cookie:tenant}),200,'tenant can view own bill')
 expect(await request('/api/v2/bills/'+billId+'?propertyId='+prop,{cookie:bob}),404,'other owner cannot read tenant bill')
 expect(await request('/api/v2/bills/'+billId+'/payments',{method:'POST',cookie:tenant,
    extraHeaders:{'idempotency-key':'p26-denied-'+tag},body:{propertyId:prop,amount:'1.00',method:'cash'}
 }),403,'tenant cannot confirm payment')
 const paymentPath='/api/v2/bills/'+billId+'/payments'
 const firstPay=expect(await request(paymentPath,{method:'POST',cookie:alice,
   extraHeaders:{'idempotency-key':'p26-partial-'+tag},
   body:{propertyId:prop,amount:'1500.00',method:'cash'}}),201,'partial bill payment')
 assert.equal(firstPay.data.status,'partial')
 assert.equal(firstPay.data.outstanding,'2850.00')
 const replayPay=expect(await request(paymentPath,{method:'POST',cookie:alice,extraHeaders:{'idempotency-key':'p26-partial-'+tag},body:{propertyId:prop,amount:'1500.00',method:'cash'}}),200,'payment replay idempotent')
 assert.equal(replayPay.data.paymentId,firstPay.data.paymentId)
 expect(await request(paymentPath,{method:'POST',cookie:alice,extraHeaders:{'idempotency-key':'p26-partial-'+tag},body:{propertyId:prop,amount:'1501.00',method:'cash'}}),409,'payment replay with changed amount rejected')
 const competing=await Promise.all([
   request(paymentPath,{method:'POST',cookie:alice,
     extraHeaders:{'idempotency-key':'p26-final-a-'+tag},
     body:{propertyId:prop,amount:'2850.00',method:'transfer'}}),
   request(paymentPath,{method:'POST',cookie:alice,
     extraHeaders:{'idempotency-key':'p26-final-b-'+tag},
     body:{propertyId:prop,amount:'2850.00',method:'transfer'}}),
 ])
 assert.deepEqual(competing.map(r=>r.status).sort((a,b)=>a-b),[201,409],
   'concurrent distinct payment keys: exactly one should succeed')
 console.log('PASS concurrent payments: one accepted, one rejected')
 const finalBill=expect(await request('/api/v2/bills/'+billId+'?propertyId='+prop,{cookie:alice}),
   200,'finalized paid bill details')
 assert.equal(finalBill.data.bill.status,'paid')
 assert.equal(finalBill.data.outstanding,'0.00')
 assert.equal(finalBill.data.paid,'4350.00')
 assert.equal(finalBill.data.payments.length,2)
 expect(await request('/api/v2/bills?propertyId='+prop,{cookie:tenant}),200,'tenant bill history')
 expect(await request('/api/v2/bills/'+billId+'?propertyId='+prop,{cookie:tenant}),200,'tenant bill remains readable after settlement')
 expect(await request('/api/v2/checkout',{method:'POST',cookie:alice,body:{propertyId:prop,stayId}}),409,'checkout blocked with active lease')
 expect(await request('/api/v2/leases',{method:'POST',cookie:alice,body:{action:'terminate',propertyId:prop,leaseId:lease}}),200,'owner terminates lease')
 expect(await request('/api/v2/checkout',{method:'POST',cookie:alice,body:{propertyId:prop,stayId}}),200,'owner checks tenant out')
 expect(await request('/api/v2/bills/'+billId+'?propertyId='+prop,{cookie:tenant}),200,'tenant can read historical bill after checkout')
 expect(await request('/api/v2/bills/'+billId+'/payments?propertyId='+prop,{cookie:tenant}),200,'tenant can read payment balance after checkout')
 // Verified logout must revoke the cookie on the server, not just clear browser state.
 expect(await request('/api/v2/logout',{method:'POST',cookie:bob,body:{}}),200,'logout bob')
 expect(await request('/api/v2/me',{cookie:bob}),401,'revoked session denied')
 const relog=expect(await request('/api/v2/login',{method:'POST',body:{email:email('bob'),password}}),200,'bob logs in again')
 expect(await request('/api/v2/me',{cookie:relog.cookie}),200,'new session accepted')
 console.log('PASS P2.6 LIVE Railway staging to Neon Auth/QR/Billing/permission HTTP E2E')
}
await main()
