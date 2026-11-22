'use client'
import {FormEvent,useEffect,useState} from 'react'
type Property={id:string;name:string;property_type:string;role:string}
type RequestItem={id:string;email:string;status:string;unit_name:string|null}
type Unit={id:string;name:string}
async function api(action:string,body?:Record<string,unknown>){
  const response=await fetch('/api/v2/'+action,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store'})
  const data=await response.json()
  if(!response.ok)throw Error(data.error||'Request failed')
  return data
}
export default function CloudOwnerPage(){
  const [account,setAccount]=useState<{email:string}|null>(null)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [name,setName]=useState('')
  const [type,setType]=useState('apartment')
  const [properties,setProperties]=useState<Property[]>([])
  const [selected,setSelected]=useState('')
  const [unit,setUnit]=useState('')
  const [invite,setInvite]=useState<{url:string;svg:string}|null>(null)
  const [requests,setRequests]=useState<RequestItem[]>([])
  const [units,setUnits]=useState<Unit[]>([])
  const [approveUnit,setApproveUnit]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const load=async()=>{
    try{
      const a=await api('me');setAccount(a)
      const p=await api('properties');setProperties(p.items)
    }catch{setAccount(null)}
  }
  useEffect(()=>{void load()},[])
  async function run(fn:()=>Promise<void>){setBusy(true);setMessage('');try{await fn()}catch(e){setMessage(e instanceof Error?e.message:'เกิดข้อผิดพลาด')}finally{setBusy(false)}}
  async function sign(e:FormEvent,action:'register'|'login'){e.preventDefault();await run(async()=>{await api(action,{email,password});setPassword('');await load();setMessage('เข้าสู่ระบบสำเร็จ')})}
  async function create(e:FormEvent){e.preventDefault();await run(async()=>{const p=await api('property',{name,type});await load();setSelected(p.id);setMessage('สร้างที่พักแล้ว');await loadUnits(p.id)})}
  async function loadUnits(id:string){const r=await fetch('/api/v2/units?propertyId='+encodeURIComponent(id),{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error);setUnits(data.items)}
  async function loadRequests(id:string){await run(async()=>{const r=await fetch('/api/v2/requests?propertyId='+encodeURIComponent(id),{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error);setRequests(data.items)})}
  return <main className="wrap" style={{maxWidth:900}}>
    <a href="/">← StayHub</a><h1>StayHub Cloud · เจ้าของที่พัก</h1>
    <p className="muted">ทดสอบระบบผูกบัญชีและ QR เฉพาะ Staging ยังไม่ใช่ระบบสำหรับข้อมูลผู้เช่าจริง</p>
    {!account?<section className="card section"><h2>สมัคร / เข้าสู่ระบบ</h2>
      <form className="list" onSubmit={e=>void sign(e,'login')}>
        <label>อีเมล<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
        <label>รหัสผ่าน (อย่างน้อย 12 ตัวอักษร)<input type="password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} required/></label>
        <div className="flow"><button type="button" disabled={busy} className="btn" onClick={e=>void sign(e,'register')}>สมัครบัญชีทดลอง</button>
          <button type="submit" disabled={busy} className="btn secondary">เข้าสู่ระบบ</button></div>
      </form>
    </section>:<>
      <section className="card section"><strong>เข้าสู่ระบบ: {account.email}</strong><h2>สร้างที่พัก</h2>
        <form className="list" onSubmit={create}>
          <label>ชื่อที่พัก<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
          <label>ประเภทที่พัก<select value={type} onChange={e=>setType(e.target.value)}>
            <option value="apartment">หอพัก/อพาร์ตเมนต์</option><option value="guesthouse">เกสต์เฮาส์</option>
            <option value="daily">ที่พักรายวัน</option><option value="homestay">โฮมสเตย์</option>
          </select></label><button disabled={busy} className="btn">สร้างที่พัก</button>
        </form>
      </section>
      <section className="card section"><h2>QR เชิญผู้เช่า</h2>
        <label>เลือกที่พัก<select value={selected} onChange={e=>{setSelected(e.target.value);setInvite(null);setRequests([]);setApproveUnit('');if(e.target.value)void loadUnits(e.target.value)}}>
          <option value="">-- เลือกที่พัก --</option>{properties.filter(p=>['owner','admin'].includes(p.role)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>
        {selected&&<div className="list section">
          <label>เพิ่มห้อง<input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="เช่น A101"/></label>
          <button type="button" disabled={busy||!unit.trim()} className="btn secondary" onClick={()=>void run(async()=>{await api('unit',{propertyId:selected,name:unit});setUnit('');await loadUnits(selected);setMessage('เพิ่มห้องสำเร็จ')})}>เพิ่มห้องพัก</button>
          <button disabled={busy} className="btn" onClick={()=>void run(async()=>{setInvite(await api('create-invite',{propertyId:selected}))})}>สร้าง QR ประจำที่พัก (7 วัน)</button>
          {invite&&<div className="card">
            <img src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(invite.svg)} width="260" height="260" alt="QR สำหรับเข้าร่วมที่พัก"/>
            <p><a href={invite.url}>{invite.url}</a></p>
            <p className="muted">QR ผูกกับที่พักนี้และบัญชีเจ้าของในฐานข้อมูลอัตโนมัติ สแกนแล้วรอการอนุมัติก่อนเข้าถึงข้อมูล</p>
          </div>}
          <button className="btn secondary" disabled={busy} onClick={()=>void loadRequests(selected)}>ดูคำขอเข้าร่วม</button>
          {requests.map(r=><div key={r.id} className="card">
            <p>{r.email} · {r.status} {r.unit_name||''}</p>
            {r.status==='pending'&&<div className="list"><label>เลือกห้องที่จะผูก<select value={approveUnit} onChange={e=>setApproveUnit(e.target.value)}><option value="">-- เลือกห้อง --</option>{units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
              <button className="btn" disabled={busy||!approveUnit} onClick={()=>void run(async()=>{await api('approve',{propertyId:selected,requestId:r.id,unitId:approveUnit});await loadRequests(selected)})}>อนุมัติผูกห้อง</button></div>}
          </div>)}
        </div>}
      </section>
    </>}
    {message&&<p role="status" className="card">{message}</p>}
  </main>
}
