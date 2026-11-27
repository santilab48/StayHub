#!/usr/bin/env node
// STAGING ONLY; synthetic test accounts, no real tenant or production records.
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
const BASE='https://stayhub-fsd-staging.up.railway.app'
if(process.env.CI!=='true'||process.env.STAYHUB_REPAIR_TEST_BASE!==BASE)
 throw Error('REFUSED: only approved Railway staging host')
const tag=randomBytes(8).toString('hex')
const email=n=>'repair-'+tag+'-'+n+'@example.invalid'
const pw='Staging-Only-Repaired-12345!'
const request=async(path,{method='GET',cookie,body}={})=>{
 const headers={}
 if(cookie)headers.cookie=cookie
 if(body!==undefined){headers.origin=BASE;headers['content-type']='application/json'}
 const res=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'})
 return {status:res.status,data:await res.json().catch(()=>null),cookie:res.headers.get('set-cookie')?.split(';')[0]}
}
const expect=(v,status,label)=>{assert.equal(v.status,status,label+': '+v.status+' '+JSON.stringify(v.data));console.log('PASS',label);return v.data}
async function register(name){
 const r=await request('/api/v2/register',{method:'POST',body:{email:email(name),password:pw}})
 expect(r,201,'register '+name)
 assert.ok(r.cookie?.startsWith('stayhub_session='))
 return r.cookie
}
const owner=await register('owner')
const tenant=await register('tenant')
const outside=await register('other')
const p=expect(await request('/api/v2/property',{method:'POST',cookie:owner,body:{name:'Repair E2E '+tag,type:'apartment'}}),201,'property').id
const u=expect(await request('/api/v2/unit',{method:'POST',cookie:owner,body:{propertyId:p,name:'R101'}}),201,'unit').id
const invite=expect(await request('/api/v2/create-invite',{method:'POST',cookie:owner,body:{propertyId:p,unitId:u}}),201,'invite')
expect(await request('/api/v2/join',{method:'POST',cookie:tenant,body:{token:new URL(invite.url).searchParams.get('token')}}),201,'join')
const reqs=expect(await request('/api/v2/requests?propertyId='+p,{cookie:owner}),200,'owner requests')
expect(await request('/api/v2/approve',{method:'POST',cookie:owner,body:{propertyId:p,requestId:reqs.items.find(x=>x.status==='pending').id,unitId:u}}),200,'approve')
const get=(cookie)=>request('/api/v2/repairs?propertyId='+p,{cookie})
const post=(cookie,body)=>request('/api/v2/repairs',{cookie,method:'POST',body:{propertyId:p,...body}})
expect(await get(outside),403,'other account denied')
expect(await get(tenant),200,'tenant repair list')
expect(await post(owner,{action:'create',unitId:u,title:'Owner cannot impersonate tenant',detail:'should be denied'}),400,'owner without stay cannot submit tenant request')
const repair=expect(await post(tenant,{action:'create',unitId:u,title:'Staging fixture repair',detail:'Staging only test'}),201,'tenant creates repair').id
expect(await post(tenant,{action:'transition',id:repair,status:'accepted'}),403,'tenant denied owner transition')
expect(await post(owner,{action:'transition',id:repair,status:'closed'}),409,'invalid status jump denied')
expect(await post(owner,{action:'transition',id:repair,status:'accepted'}),200,'owner accepts')
const tomorrow=new Date(Date.now()+48*60*60*1000).toISOString()
expect(await post(owner,{action:'schedule',id:repair,appointmentAt:tomorrow}),200,'owner schedules')
expect(await post(tenant,{action:'respond',id:repair,response:'confirmed'}),200,'tenant confirms appointment')
expect(await post(owner,{action:'transition',id:repair,status:'in_progress'}),200,'owner starts work')
expect(await post(owner,{action:'transition',id:repair,status:'completed'}),200,'owner completes')
expect(await post(owner,{action:'transition',id:repair,status:'closed'}),200,'owner closes')
const status=expect(await get(tenant),200,'tenant sees final record')
assert.equal(status.items.find(x=>x.id===repair)?.status,'closed')
expect(await post(owner,{action:'transition',id:repair,status:'accepted'}),409,'closed request immutable')
console.log('PASS repair workflow + tenant boundary LIVE STAGING (no Production writes)')
