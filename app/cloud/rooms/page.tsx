'use client'
import {FormEvent,useCallback,useEffect,useState} from 'react'
type Property={id:string;name:string;role:string}
type Unit={id:string;name:string}
type Occupancy={id:string;name:string;kind:string;capacity:number;active:boolean;occupants:number;cleaning:boolean;blocked:boolean;reserved:boolean}
type Stay={stay_id:string;unit_id:string;unit_name:string;email:string;starts_at:string;ends_at:string|null}
type Block={id:string;unit_id:string;reason:string;ends_at:string}
async function request<T>(path:string,body?:Record<string,unknown>):Promise<T>{
 const res=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined})
 const value=await res.json()
 if(!res.ok)throw Error(typeof value.error==='string'?value.error:'Request failed')
 return value as T
}
export default function RoomsPage(){
 const [properties,setProperties]=useState<Property[]>([])
 const [propertyId,setPropertyId]=useState('')
 const [rooms,setRooms]=useState<Occupancy[]>([])
 const [stays,setStays]=useState<Stay[]>([])
 const [blocks,setBlocks]=useState<Block[]>([])
 const [name,setName]=useState('')
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
 const [error,setError]=useState('')
 const [selectedStay,setSelectedStay]=useState('')
 const [targetUnit,setTargetUnit]=useState('')
 const [blockUnit,setBlockUnit]=useState('')
 const [until,setUntil]=useState('')
 const load=useCallback(async(id:string)=>{
  if(!id){setRooms([]);setStays([]);setBlocks([]);return}
  const [r,s,b]=await Promise.all([
   request<{items:Occupancy[]}>('/api/v2/occupancy?propertyId='+encodeURIComponent(id)),
   request<{items:Stay[]}>('/api/v2/residents?propertyId='+encodeURIComponent(id)),
   request<{items:Block[]}>('/api/v2/blocks?propertyId='+encodeURIComponent(id))
  ])
  setRooms(r.items);setStays(s.items);setBlocks(b.items)
 },[])
 useEffect(()=>{let active=true
  void request<{items:Property[]}>('/api/v2/properties').then(data=>{
   if(!active)return
   const owned=data.items.filter(p=>['owner','admin'].includes(p.role))
   setProperties(owned);setPropertyId(owned[0]?.id||'')
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load properties')})
  return()=>{active=false}
 },[])
 useEffect(()=>{let active=true;setRooms([]);setStays([]);setBlocks([])
  void load(propertyId).catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load rooms')})
  return()=>{active=false}
 },[propertyId,load])
 async function act(task:()=>Promise<void>){
  if(busy)return
  setBusy(true);setError('');setNotice('')
  try{await task();await load(propertyId)}
  catch(e){setError(e instanceof Error?e.message:'Operation failed')}
  finally{setBusy(false)}
 }
 function create(e:FormEvent){e.preventDefault();void act(async()=>{
  await request('/api/v2/unit',{propertyId,name:name.trim()})
  setName('');setNotice('เพิ่มห้องเรียบร้อย')
 })}
 function transfer(e:FormEvent){e.preventDefault();if(!selectedStay||!targetUnit)return;void act(async()=>{
  await request('/api/v2/transfer',{propertyId,stayId:selectedStay,unitId:targetUnit})
  setNotice('ย้ายห้องเรียบร้อย')
 })}
 function blockRoom(e:FormEvent){e.preventDefault();if(!blockUnit||!until)return;void act(async()=>{
  await request('/api/v2/block-room',{propertyId,unitId:blockUnit,reason:'maintenance',endsAt:new Date(until).toISOString()})
  setUntil('');setNotice('ปิดห้องซ่อมบำรุงแล้ว')
 })}
 const activeStays=stays.filter(s=>!s.ends_at||new Date(s.ends_at)>new Date())
 const options=rooms.filter(r=>r.active)
 return <main className="wrap" style={{maxWidth:1050}}>
  <p><a href="/cloud">← จัดการที่พัก</a></p>
  <h1>ห้องพักและผู้พัก · StayHub Cloud</h1>
  <p className="muted">ข้อมูลจาก PostgreSQL/Neon ชุดเดียวกับระบบ QR และระบบบิล</p>
  <section className="card section"><label>ที่พัก<select value={propertyId} onChange={e=>setPropertyId(e.target.value)}>
   <option value="">-- เลือกที่พัก --</option>
   {properties.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
  </select></label></section>
  {error&&<p role="alert" className="card section" style={{color:'crimson'}}>{error}</p>}
  {notice&&<p role="status" className="card section">{notice}</p>}
  {propertyId&&<>
   <section className="card section"><h2>เพิ่มห้องพัก</h2>
    <form className="flow" onSubmit={create}><label>ชื่อ / เลขห้อง
     <input maxLength={80} required value={name} onChange={e=>setName(e.target.value)} placeholder="เช่น A101"/></label>
     <button type="submit" className="btn" disabled={busy||!name.trim()}>{busy?'กำลังบันทึก...':'+ เพิ่มห้อง'}</button></form>
    <small className="muted">เลขห้องต้องไม่ซ้ำในที่พักเดียวกัน</small>
   </section>
   <section className="card section"><h2>ห้องทั้งหมด ({rooms.length})</h2>
    {!rooms.length?<p>ยังไม่มีห้องพัก</p>:<div className="list">{rooms.map(r=><div className="row" key={r.id}><div>
     <strong>{r.name}</strong>
     <p className="muted">ผู้พัก {r.occupants}/{r.capacity} · {r.blocked?'ปิดปรับปรุง':r.cleaning?'รอทำความสะอาด':r.occupants?'มีผู้เข้าพัก':'ว่าง'}</p>
    </div><span className="pill">{r.active?'ใช้งาน':'ปิด'}</span></div>)}</div>}
   </section>
   <section className="card section"><h2>ผู้เข้าพักและประวัติ</h2>
    {!stays.length?<p>ยังไม่มีผู้เข้าพัก <a href="/cloud">ไปสร้าง QR เชิญและอนุมัติผู้เช่า</a></p>:<div className="list">{stays.map(s=><div key={s.stay_id} className="row">
     <div><strong>{s.email}</strong><p className="muted">{s.unit_name} · {s.ends_at?'ย้ายออกแล้ว':'เข้าพัก'} · {String(s.starts_at).slice(0,10)}</p></div>
     {!s.ends_at&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>{if(window.confirm('ยืนยันย้ายออก? หากมีสัญญาเช่าอยู่ต้องยุติสัญญาก่อน'))void act(async()=>{await request('/api/v2/checkout',{propertyId,stayId:s.stay_id});setNotice('บันทึกย้ายออกแล้ว')})}}>ย้ายออก</button>}
    </div>)}</div>}
   </section>
   <section className="card section"><h2>ย้ายห้อง</h2>
    <form className="list" onSubmit={transfer}>
     <label>ผู้เข้าพัก<select required value={selectedStay} onChange={e=>setSelectedStay(e.target.value)}><option value="">-- เลือกผู้เข้าพัก --</option>{activeStays.map(s=><option value={s.stay_id} key={s.stay_id}>{s.email} · {s.unit_name}</option>)}</select></label>
     <label>ห้องใหม่<select required value={targetUnit} onChange={e=>setTargetUnit(e.target.value)}><option value="">-- เลือกห้อง --</option>{options.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
     <button type="submit" className="btn secondary" disabled={busy||!selectedStay||!targetUnit} >บันทึกย้ายห้อง</button>
    </form><p className="muted">ระบบตรวจความจุห้องและสัญญาที่ยังใช้งานก่อนย้าย</p>
   </section>
   <section className="card section"><h2>ปิดห้องเพื่อซ่อม</h2>
    <form className="list" onSubmit={blockRoom}>
     <label>ห้อง<select required value={blockUnit} onChange={e=>setBlockUnit(e.target.value)}><option value="">-- เลือกห้อง --</option>{options.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
     <label>ปิดถึง<input type="datetime-local" required value={until} onChange={e=>setUntil(e.target.value)}/></label>
     <button type="submit" className="btn secondary" disabled={busy||!blockUnit||!until}>ปิดห้อง</button>
    </form>
    {blocks.map(b=><div className="row" key={b.id}><span>{rooms.find(r=>r.id===b.unit_id)?.name||'ห้อง'} · ปิดถึง {new Date(b.ends_at).toLocaleString('th-TH')}</span>
     <button type="button" className="btn secondary" disabled={busy} onClick={()=>void act(async()=>{await request('/api/v2/unblock-room',{propertyId,blockId:b.id});setNotice('เปิดห้องแล้ว')})}>เปิดห้อง</button></div>)}
   </section>
   <section className="card section"><h2>การเงิน</h2><p><a className="btn" href="/cloud/leases">จัดการสัญญาเช่า</a> <a className="btn secondary" href="/cloud/billing">มิเตอร์และทำบิล</a></p></section>
  </>}
 </main>
}
