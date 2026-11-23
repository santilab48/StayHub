'use client'
import {useEffect,useState} from 'react'
type Property={id:string;name:string;role:string}
type Bill={id:string;property_id:string;unit_name:string;period:string;total:string;paid:string;outstanding:string;status:string}
async function get<T>(path:string):Promise<T>{
 const r=await fetch(path,{credentials:'same-origin',cache:'no-store'})
 const value=await r.json()
 if(!r.ok)throw Error(value.error||'ไม่สามารถโหลดข้อมูลได้')
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
 useEffect(()=>{let active=true;setBills([])
  const query=new URLSearchParams({limit:'50',page:String(page)})
  if(propertyId)query.set('propertyId',propertyId)
  void get<{items:Bill[];hasMore:boolean}>('/api/v2/bills?'+query).then(r=>{
   if(active){setBills(r.items);setMore(r.hasMore)}
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:'โหลดบิลไม่สำเร็จ')})
  return()=>{active=false}
 },[propertyId,page])
 const paid=bills.filter(b=>b.status==='paid'&&Number(b.outstanding)===0)
 return <main className="wrap" style={{maxWidth:1000}}>
  <p><a href="/cloud/billing">← กลับระบบบิล</a></p>
  <h1>ใบเสร็จที่ชำระครบ · StayHub Cloud</h1>
  <p className="muted">ใช้ข้อมูลที่ชำระจริงบน PostgreSQL ไม่สร้างใบเสร็จสำหรับยอดที่ยังค้าง</p>
  {properties.length>0&&<section className="card section"><label>ที่พัก<select value={propertyId} onChange={e=>{setPage(1);setPropertyId(e.target.value)}}>
   <option value="">บิลของฉัน (ผู้เข้าพัก)</option>
   {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
  </select></label></section>}
  {error&&<p role="alert" style={{color:'crimson'}}>{error}</p>}
  <section className="card section">
   <h2>รายการชำระครบ</h2>
   {!paid.length?<p>ไม่มีใบเสร็จในหน้านี้</p>:<div className="list">{paid.map(b=><div className="row" key={b.id}>
    <div><strong>{b.unit_name} · {String(b.period).slice(0,7)}</strong><p className="muted">{Number(b.total).toLocaleString('th-TH')} บาท · ชำระครบ</p></div>
    <a className="btn" href={'/cloud/receipts/'+encodeURIComponent(b.id)+'?propertyId='+encodeURIComponent(b.property_id)}>ดู / พิมพ์ PDF</a>
   </div>)}</div>}
   <div className="flow section"><button type="button" className="btn secondary" disabled={page===1} onClick={()=>setPage(p=>p-1)}>ก่อนหน้า</button><span>หน้า {page}</span><button type="button" className="btn secondary" disabled={!more} onClick={()=>setPage(p=>p+1)}>ถัดไป</button></div>
  </section>
 </main>
}
