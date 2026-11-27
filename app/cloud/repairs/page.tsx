'use client'
import dashboardStyles from '../dashboard.module.css'
import {recordStatusLabel} from '../../../lib/record-status-label'
import {userFacingError} from '../../../lib/user-facing-error'
import {FormEvent,useCallback,useEffect,useState} from 'react'
type Property={id:string;name:string;role:string}
type Stay={property_id:string;property_name:string;unit_id:string;unit_name:string}
type Unit={id:string;name:string}
type Repair={id:string;unit_name:string;unit_id:string;title:string;detail:string;status:string;appointment_at:string|null;appointment_reply:string|null;created_at:string}
async function api<T>(path:string,body?:Record<string,unknown>):Promise<T>{
 const res=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined})
 const data=await res.json()
 if(!res.ok)throw Error(userFacingError(data.error))
 return data as T
}
const step:Record<string,{label:string;next:string}>={submitted:{label:'รับงาน',next:'accepted'},scheduled:{label:'เริ่มซ่อม',next:'in_progress'},in_progress:{label:'ทำเสร็จ',next:'completed'},completed:{label:'ปิดงาน',next:'closed'}}
export default function CloudRepairs(){
 const [owners,setOwners]=useState<Property[]>([])
 const [stays,setStays]=useState<Stay[]>([])
 const [propertyId,setPropertyId]=useState('')
 const [units,setUnits]=useState<Unit[]>([])
 const [unitId,setUnitId]=useState('')
 const [focusId,setFocusId]=useState('')
 useEffect(()=>{setFocusId(new URLSearchParams(window.location.search).get('unitId')||'')},[])
 const [list,setList]=useState<Repair[]>([])
 const [owner,setOwner]=useState(false)
 const [title,setTitle]=useState('')
 const [detail,setDetail]=useState('')
 const [appointment,setAppointment]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const load=useCallback(async(prop:string)=>{
  if(!prop){setList([]);setOwner(false);return}
  const data=await api<{items:Repair[];owner:boolean}>('/api/v2/repairs?propertyId='+encodeURIComponent(prop))
  setOwner(data.owner);setList(data.items)
 },[])
 useEffect(()=>{let active=true
  void Promise.all([api<{items:Property[]}>('/api/v2/properties'),api<{items:Stay[]}>('/api/v2/my-stays')])
   .then(([p,s])=>{if(!active)return
    const managed=p.items.filter(x=>['owner','admin'].includes(x.role))
    setOwners(managed);setStays(s.items)
    setPropertyId(managed[0]?.id||s.items[0]?.property_id||'')
   }).catch(e=>{if(active)setError(e instanceof Error?e.message:'กรุณาเข้าสู่ระบบ Cloud')})
  return()=>{active=false}
 },[])
 useEffect(()=>{let active=true;setList([]);setError('')
  void load(propertyId).catch(e=>{if(active)setError(e instanceof Error?e.message:'โหลดงานซ่อมไม่สำเร็จ')})
  return()=>{active=false}
 },[propertyId,load])
 useEffect(()=>{let active=true
  if(!propertyId){setUnits([]);setUnitId('');return}
  const isOwner=owners.some(x=>x.id===propertyId)
  if(isOwner)void api<{items:Unit[]}>('/api/v2/units?propertyId='+encodeURIComponent(propertyId))
   .then(r=>{if(active){setUnits(r.items);setUnitId(r.items.find(u=>u.id===focusId)?.id||r.items[0]?.id||'')}})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'โหลดห้องไม่สำเร็จ')})
  else{
   const mine=stays.filter(x=>x.property_id===propertyId).map(x=>({id:x.unit_id,name:x.unit_name}))
   setUnits(mine);setUnitId(mine[0]?.id||'')
  }
  return()=>{active=false}
 },[propertyId,owners,stays,focusId])
 async function run(body:Record<string,unknown>){
  if(busy)return
  setBusy(true);setNotice('');setError('')
  try{await api('/api/v2/repairs',{propertyId,...body});await load(propertyId);setNotice('บันทึกสำเร็จ')}
  catch(e){setError(e instanceof Error?e.message:'บันทึกไม่สำเร็จ')}
  finally{setBusy(false)}
 }
 async function submit(e:FormEvent){e.preventDefault()
  if(!title.trim()||!detail.trim()||!unitId)return
  await run({action:'create',unitId,title:title.trim(),detail:detail.trim()})
  setTitle('');setDetail('')
 }
 return <main className={dashboardStyles.detail}><div className={dashboardStyles.detailInner}>
  <header className={dashboardStyles.detailHeader}><a className={dashboardStyles.detailBrand} href="/cloud?tab=services">StayHub <span>Cloud</span></a><a className={dashboardStyles.back} href="/cloud?tab=services">กลับหน้าจัดการ</a></header>
  <h1>แจ้งซ่อมและติดตามงาน · StayHub Cloud</h1>
  <p className="muted">งานซ่อมผูกกับห้องและบัญชีผู้แจ้งจริง พร้อมประวัติสถานะ</p>
  
  {error&&<p role="alert" className="card section" style={{color:'crimson'}}>{error}</p>}
  {notice&&<p role="status" className="card section">{notice}</p>}
  {propertyId&&<>
   {!owner&&<section className="card section"><h2>แจ้งปัญหาใหม่</h2>
    <form className="list" onSubmit={e=>void submit(e)}>
     <label>ห้อง<select value={unitId} required onChange={e=>setUnitId(e.target.value)}>
      {units.length===0&&<option value="">-- ไม่มีห้อง --</option>}
      {units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
     </select></label>
     <label>เรื่องที่ต้องซ่อม<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}/></label>
     <label>รายละเอียด<textarea required maxLength={4000} value={detail} onChange={e=>setDetail(e.target.value)}/></label>
     <button type="submit" className="btn" disabled={busy||!unitId||!title.trim()||!detail.trim()}>ส่งแจ้งซ่อม</button>
    </form>
   </section>}
   <section className="card section"><h2>รายการแจ้งซ่อม ({list.filter(r=>!focusId||r.unit_id===focusId).length})</h2>{focusId&&<a className="btn secondary" href="/cloud/repairs">ดูงานซ่อมทุกห้อง</a>}
    {!list.some(r=>!focusId||r.unit_id===focusId)?<p>ยังไม่มีรายการ</p>:<div className="list">{list.filter(r=>!focusId||r.unit_id===focusId).map(r=><div className="card section" key={r.id}>
     <div className="row"><div><strong>{r.unit_name} · {r.title}</strong><p className="muted">{r.detail}</p></div>
      <span className="pill">{recordStatusLabel(r.status)}</span></div>
     {r.appointment_at&&<p>นัดหมาย: {new Date(r.appointment_at).toLocaleString('th-TH')} {r.appointment_reply==='confirmed'?'· ผู้พักยืนยันแล้ว':r.appointment_reply==='change_requested'?'· ขอเปลี่ยนเวลา':''}</p>}
     {owner&&r.status==='accepted'&&<form className="flow" onSubmit={e=>{e.preventDefault();if(appointment)void run({action:'schedule',id:r.id,appointmentAt:new Date(appointment).toISOString()})}}>
      <label>วันเวลานัด<input type="datetime-local" required value={appointment} onChange={e=>setAppointment(e.target.value)}/></label>
      <button type="submit" className="btn" disabled={busy||!appointment}>นัดหมาย</button>
     </form>}
     {owner&&r.status==='scheduled'&&<form className="flow" onSubmit={e=>{e.preventDefault();if(appointment)void run({action:'schedule',id:r.id,appointmentAt:new Date(appointment).toISOString()})}}>
      <label>แก้นัด<input type="datetime-local" required value={appointment} onChange={e=>setAppointment(e.target.value)}/></label>
      <button type="submit" className="btn secondary" disabled={busy||!appointment}>บันทึกนัดใหม่</button>
     </form>}
     {owner&&step[r.status]&&<button type="button" className="btn" disabled={busy} onClick={()=>void run({action:'transition',id:r.id,status:step[r.status].next})}>{step[r.status].label}</button>}
     {!owner&&r.status==='scheduled'&&<div className="flow">
      <button type="button" className="btn" disabled={busy} onClick={()=>void run({action:'respond',id:r.id,response:'confirmed'})}>ยืนยันนัด</button>
      <button type="button" className="btn secondary" disabled={busy} onClick={()=>void run({action:'respond',id:r.id,response:'change_requested'})}>ขอแก้เวลา</button>
     </div>}
    </div>)}</div>}
   </section>
  </>}
 </div></main>
}
