'use client'
import dashboardStyles from '../dashboard.module.css'
import {useEffect,useState} from 'react'
import {userFacingError} from '../../../lib/user-facing-error'
type Property={id:string;name:string;role:string}
type Bill={id:string;property_id:string;unit_name:string;period:string;total:string;paid:string;outstanding:string;status:string}
async function get<T>(path:string):Promise<T>{
 const r=await fetch(path,{credentials:'same-origin',cache:'no-store'})
 const value=await r.json()
 if(!r.ok)throw Error(userFacingError(value.error,'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่'))
 return value as T
}
export default function Receipts(){
 const [properties,setProperties]=useState<Property[]>([])
 const [propertyId,setPropertyId]=useState('')
 const [bills,setBills]=useState<Bill[]>([])
 const [error,setError]=useState('')
 const [page,setPage]=useState(1)
 const [more,setMore]=useState(false)
 useEffect(()=>{let alive=true
  void get<{items:Property[]}>('/api/v2/properties').then(p=>{
   if(!alive)return
   const owned=p.items.filter(x=>x.role==='owner'||x.role==='admin')
   setProperties(owned);setPropertyId(owned[0]?.id||'')
  }).catch(e=>{if(alive)setError(e instanceof Error?e.message:'เข้าสู่ระบบก่อน')})
  return()=>{alive=false}
 },[])
 useEffect(()=>{let active=true;setBills([]);setMore(false);setError('')
  if(!propertyId)return()=>{active=false}
  const query=new URLSearchParams({limit:'50',page:String(page),propertyId,status:'paid'})
  void get<{items:Bill[];hasMore:boolean}>('/api/v2/bills?'+query).then(r=>{
   if(active){setBills(r.items);setMore(r.hasMore)}
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:'โหลดบิลไม่สำเร็จ')})
  return()=>{active=false}
 },[propertyId,page])
 const paid=bills.filter(b=>b.status==='paid'&&Number(b.outstanding)===0)
 return <main className={dashboardStyles.detail}><div className={dashboardStyles.detailInner}>
  <header className={dashboardStyles.detailHeader}><a className={dashboardStyles.detailBrand} href="/cloud?tab=finance">StayHub <span>Cloud</span></a><a className={dashboardStyles.back} href="/cloud?tab=finance">กลับหน้าจัดการ</a></header>
  <h1>ใบเสร็จที่ชำระครบ · StayHub Cloud</h1>
  <p className="muted">แสดงเฉพาะบิลที่ชำระครบแล้ว ไม่ออกใบเสร็จสำหรับยอดที่ยังค้าง</p>
  
  {error&&<p role="alert" style={{color:'crimson'}}>{error}</p>}
  <section className="card section">
   <h2>รายการชำระครบ</h2>
   {!paid.length?<p>ไม่มีใบเสร็จในหน้านี้</p>:<div className="list">{paid.map(b=><div className="row" key={b.id}>
    <div><strong>{b.unit_name} · {String(b.period).slice(0,7)}</strong><p className="muted">{Number(b.total).toLocaleString('th-TH')} บาท · ชำระครบ</p></div>
    <a className="btn" href={'/cloud/receipts/'+encodeURIComponent(b.id)+'?propertyId='+encodeURIComponent(b.property_id)}>ดูใบเสร็จ</a>
   </div>)}</div>}
   <div className="flow section"><button type="button" className="btn secondary" disabled={page===1} onClick={()=>setPage(p=>p-1)}>ก่อนหน้า</button><span>หน้า {page}</span><button type="button" className="btn secondary" disabled={!more} onClick={()=>setPage(p=>p+1)}>ถัดไป</button></div>
  </section>
 </div></main>
}
