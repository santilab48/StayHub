'use client'
import dashboardStyles from '../dashboard.module.css'
import {FormEvent,useCallback,useEffect,useState} from 'react'

type Property={id:string;name:string;role:string}
type Stay={stay_id:string;account_id:string;unit_id:string;unit_name:string;email:string;ends_at:string|null}
type Lease={id:string;stay_id:string;unit_name:string;monthly_rent:string;security_deposit:string;starts_on:string;ends_on:string|null;status:string}
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'})
async function api<T>(path:string,body?:Record<string,unknown>):Promise<T>{
 const response=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined})
 const result=await response.json()
 if(!response.ok)throw Error(typeof result.error==='string'?result.error:'ระบบไม่พร้อมใช้งาน')
 return result as T
}
export default function CloudLeases(){
 const [properties,setProperties]=useState<Property[]>([])
 const [propertyId,setPropertyId]=useState('')
 const [stays,setStays]=useState<Stay[]>([])
 const [leases,setLeases]=useState<Lease[]>([])
 const [stayId,setStayId]=useState('')
 const [startsOn,setStartsOn]=useState(today)
 const [endsOn,setEndsOn]=useState('')
 const [rent,setRent]=useState('')
 const [deposit,setDeposit]=useState('0')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const load=useCallback(async(id:string)=>{
  if(!id){setStays([]);setLeases([]);return}
  const [residents,existing]=await Promise.all([
   api<{items:Stay[]}>('/api/v2/residents?propertyId='+encodeURIComponent(id)),
   api<{items:Lease[]}>('/api/v2/leases?propertyId='+encodeURIComponent(id))
  ])
  const active=residents.items.filter(s=>!s.ends_at||new Date(s.ends_at)>new Date())
  setStays(active);setLeases(existing.items)
  setStayId(current=>active.some(s=>s.stay_id===current)?current:active[0]?.stay_id||'')
 },[])
 useEffect(()=>{let live=true
  void api<{items:Property[]}>('/api/v2/properties').then(p=>{
   if(!live)return
   const owned=p.items.filter(x=>x.role==='owner'||x.role==='admin')
   setProperties(owned);setPropertyId(owned[0]?.id||'')
  }).catch(e=>{if(live)setError(e instanceof Error?e.message:'เข้าสู่ระบบ Cloud ก่อน')})
  return()=>{live=false}
 },[])
 useEffect(()=>{let live=true;setStays([]);setLeases([]);setError('')
  void load(propertyId).catch(e=>{if(live)setError(e instanceof Error?e.message:'โหลดข้อมูลสัญญาไม่สำเร็จ')})
  return()=>{live=false}
 },[propertyId,load])
 async function submit(e:FormEvent){e.preventDefault()
  if(!propertyId||!stayId||busy)return
  const monthlyRent=Number(rent),securityDeposit=Number(deposit)
  if(!Number.isFinite(monthlyRent)||monthlyRent<0||!Number.isFinite(securityDeposit)||securityDeposit<0){setError('กรุณาตรวจยอดเงิน');return}
  setBusy(true);setError('');setNotice('')
  try{
   await api('/api/v2/leases',{propertyId,action:'create',stayId,startsOn,endsOn:endsOn||null,monthlyRent,securityDeposit})
   await load(propertyId)
   setNotice('สร้างสัญญาเช่าสำเร็จ สามารถไปจดมิเตอร์และทำบิลได้')
  }catch(e){setError(e instanceof Error?e.message:'บันทึกสัญญาไม่ได้')}
  finally{setBusy(false)}
 }
 return <main className={dashboardStyles.detail}><div className={dashboardStyles.detailInner}>
  <header className={dashboardStyles.detailHeader}><a className={dashboardStyles.detailBrand} href="/cloud?tab=residents">StayHub <span>Cloud</span></a><a className={dashboardStyles.back} href="/cloud?tab=residents">กลับหน้าจัดการ</a></header>
  <h1>สัญญาเช่า · StayHub Cloud</h1>
  <p className="muted">ข้อมูลสัญญาเชื่อมกับ PostgreSQL/Neon ผ่าน API เดียวกับระบบบิล ไม่ใช้ Supabase ของหน้าจอเดิม</p>
  <section className="card section"><label>ที่พัก
   <select value={propertyId} onChange={e=>setPropertyId(e.target.value)}>
    <option value="">-- เลือกที่พัก --</option>
    {properties.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
   </select></label>
   {!properties.length&&<p>ยังไม่มีที่พักที่คุณดูแล <a href="/cloud">ไปสร้างที่พักหรือเข้าสู่ระบบ</a></p>}
  </section>
  {error&&<p className="card section" role="alert" style={{color:'crimson'}}>{error}</p>}
  {notice&&<p className="card section" role="status">{notice}</p>}
  {propertyId&&<section className="card section">
   <h2>สร้างสัญญาเช่า</h2>
   <p className="muted">ต้องอนุมัติคำขอเข้าร่วมและผูกห้องก่อน จึงจะมีผู้เช่าให้เลือก</p>
   <form className="list" onSubmit={e=>void submit(e)}>
    <label>ผู้เช่าที่เข้าพักแล้ว<select required value={stayId} onChange={e=>setStayId(e.target.value)}>
     <option value="">-- เลือกผู้เช่า --</option>
     {stays.map(s=><option key={s.stay_id} value={s.stay_id}>{s.unit_name} · {s.email}</option>)}
    </select></label>
    <label>วันเริ่มสัญญา<input type="date" required value={startsOn} onChange={e=>setStartsOn(e.target.value)}/></label>
    <label>วันสิ้นสุด (เว้นว่างถ้าไม่กำหนด)<input type="date" min={startsOn} value={endsOn} onChange={e=>setEndsOn(e.target.value)}/></label>
    <label>ค่าเช่าต่อเดือน (บาท)<input type="number" min="0" max="100000000" step="0.01" required value={rent} onChange={e=>setRent(e.target.value)}/></label>
    <label>เงินประกัน (บาท)<input type="number" min="0" max="100000000" step="0.01" required value={deposit} onChange={e=>setDeposit(e.target.value)}/></label>
    <button className="btn" type="submit" disabled={busy||!stayId}>{busy?'กำลังบันทึก...':'สร้างสัญญาเช่า'}</button>
   </form>
   {!stays.length&&<p className="muted">ยังไม่มีผู้เช่าที่อนุมัติแล้ว <a href="/cloud?tab=residents">กลับไปออก QR และอนุมัติผู้เช่า</a></p>}
  </section>}
  {propertyId&&<section className="card section"><h2>สัญญาทั้งหมด</h2>
   {!leases.length?<p className="muted">ยังไม่มีสัญญา</p>:<div className="list">{leases.map(l=><div key={l.id} className="row">
    <div><strong>{l.unit_name} · {l.status==='active'?'กำลังใช้งาน':l.status}</strong>
    <p className="muted">ค่าเช่า {Number(l.monthly_rent).toLocaleString('th-TH')} บาท · {String(l.starts_on).slice(0,10)} ถึง {l.ends_on?String(l.ends_on).slice(0,10):'ไม่กำหนด'}</p></div>
   </div>)}</div>}
   <p><a className="btn" href="/cloud/billing">ไปบันทึกมิเตอร์และออกบิล</a></p>
  </section>}
 </div></main>
}
