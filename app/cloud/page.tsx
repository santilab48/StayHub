'use client'
import {FormEvent,useEffect,useState} from 'react'
import {accommodationTypes,isAccommodationType,type AccommodationType} from '../../lib/accommodation-types'
type Property={id:string;name:string;property_type:string;role:string}
type OnboardingScreen='loading'|'choose'|'auth'|'dashboard'|'unavailable'
const ONBOARDING_KEY='stayhub_owner_preferred_type_v1'
const typeIcons:Record<AccommodationType,string>={
  apartment:'🏢',guesthouse:'🛎️',daily:'🛏️',homestay:'🏡'
}
const typeDescriptions:Record<AccommodationType,string>={
  apartment:'หอพัก ห้องเช่ารายเดือน และอพาร์ตเมนต์',
  guesthouse:'ห้องพักสำหรับผู้เดินทางและเกสต์เฮาส์',
  daily:'ที่พักรายวันและห้องพักแบบคิดต่อคืน',
  homestay:'บ้านพักและโฮมสเตย์'
}
type RequestItem={id:string;email:string;status:string;unit_name:string|null}
type Unit={id:string;name:string}
type InviteItem={id:string;created_at:string;expires_at:string;use_count:number;max_uses:number;revoked_at:string|null;unit_id:string|null}
async function api(action:string,body?:Record<string,unknown>){
  const response=await fetch('/api/v2/'+action,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store'})
  const data=await response.json()
  if(!response.ok){
    const error=new Error(data.error||'Request failed') as Error&{status?:number}
    error.status=response.status
    throw error
  }
  return data
}
export default function CloudOwnerPage(){
  const [account,setAccount]=useState<{email:string}|null>(null)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [name,setName]=useState('')
  const [type,setType]=useState<AccommodationType>('apartment')
  const [screen,setScreen]=useState<OnboardingScreen>('loading')
  const [authMode,setAuthMode]=useState<'register'|'login'>('register')
  const [showCreate,setShowCreate]=useState(false)
  const [properties,setProperties]=useState<Property[]>([])
  const [selected,setSelected]=useState('')
  const [unit,setUnit]=useState('')
  const [invite,setInvite]=useState<{id:string;url:string;svg:string}|null>(null)
  const [invites,setInvites]=useState<InviteItem[]>([])
  const [requests,setRequests]=useState<RequestItem[]>([])
  const [units,setUnits]=useState<Unit[]>([])
  const [approveUnit,setApproveUnit]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const load=async()=>{
    const a=await api('me')
    const p=await api('properties')
    setAccount(a)
    setProperties(p.items)
    setScreen('dashboard')
    // The server's actual property type takes priority over any device draft.
    if(p.items.length && isAccommodationType(p.items[0].property_type)){
      setType(p.items[0].property_type)
      try{localStorage.setItem(ONBOARDING_KEY,p.items[0].property_type)}catch{}
    }
    return p.items as Property[]
  }
  useEffect(()=>{
    let active=true
    const init=async()=>{
      const entry=new URLSearchParams(window.location.search)
      const requestedType=entry.get('type')
      const wantsLogin=entry.get('login')==='1'
      let saved:AccommodationType|null=null
      try{
        const stored=localStorage.getItem(ONBOARDING_KEY)
        if(isAccommodationType(stored))saved=stored
      }catch{}
      try{
        const a=await api('me')
        const p=await api('properties')
        if(!active)return
        setAccount(a);setProperties(p.items)
        if(p.items.length && isAccommodationType(p.items[0].property_type)){
          setType(p.items[0].property_type)
          try{localStorage.setItem(ONBOARDING_KEY,p.items[0].property_type)}catch{}
        }else if(saved){setType(saved)}
        setScreen('dashboard')
      }catch(error){
        if(!active)return
        if((error as Error&{status?:number}).status!==401){
          setAccount(null)
          setMessage('ไม่สามารถเชื่อมต่อระบบบัญชีได้ กรุณาลองใหม่อีกครั้ง')
          setScreen('unavailable')
          return
        }
        setAccount(null)
        const isTenantReturn=new URLSearchParams(window.location.search).get('return')?.startsWith('/join?token=')
        if(isAccommodationType(requestedType)){
          setType(requestedType)
          try{localStorage.setItem(ONBOARDING_KEY,requestedType)}catch{}
          setAuthMode('register')
          setScreen('auth')
        }else if(wantsLogin||isTenantReturn){
          if(saved)setType(saved)
          setAuthMode('login')
          setScreen('auth')
        }else{
          if(saved)setType(saved)
          setScreen('choose')
        }
      }
    }
    void init()
    return()=>{active=false}
  },[])
  function chooseType(next:AccommodationType){
    setType(next)
    try{localStorage.setItem(ONBOARDING_KEY,next)}catch{}
    setAuthMode('register')
    setScreen('auth')
  }
  function changeType(){
    try{localStorage.removeItem(ONBOARDING_KEY)}catch{}
    setScreen('choose')
  }
  async function run(fn:()=>Promise<void>){setBusy(true);setMessage('');try{await fn()}catch(e){setMessage(e instanceof Error?e.message:'เกิดข้อผิดพลาด')}finally{setBusy(false)}}
  async function sign(e:{preventDefault:()=>void},action:'register'|'login'){e.preventDefault();await run(async()=>{await api(action,{email,password});setPassword('');setShowPassword(false);await load();setMessage('เข้าสู่ระบบสำเร็จ');const target=new URLSearchParams(window.location.search).get('return');if(target?.startsWith('/join?token='))window.location.assign(target)})}
  async function create(e:FormEvent){e.preventDefault();await run(async()=>{const p=await api('property',{name,type});await load();setShowCreate(false);setSelected(p.id);setMessage('สร้างที่พักแล้ว');await loadUnits(p.id);await loadInvites(p.id)})}
  async function loadUnits(id:string){const r=await fetch('/api/v2/units?propertyId='+encodeURIComponent(id),{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error);setUnits(data.items)}
  async function loadInvites(id:string){const r=await fetch('/api/v2/invites?propertyId='+encodeURIComponent(id),{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error);setInvites(data.items)}
  async function loadRequests(id:string){await run(async()=>{const r=await fetch('/api/v2/requests?propertyId='+encodeURIComponent(id),{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error);setRequests(data.items)})}
  return <main className={screen==='choose'?'wrap ownerEntryPage':screen==='auth'?'wrap ownerAuthPage':'wrap'} style={{maxWidth:screen==='choose'?1240:900}}>
    {screen==='dashboard'?<><a href="/">← StayHub</a><h1>StayHub Cloud · เจ้าของที่พัก</h1></>:<a className="ownerBackLink" href="/">← กลับหน้าเลือกประเภทที่พัก</a>}
    {screen==='loading'&&<section className="card section" aria-live="polite"><p>กำลังตรวจสอบบัญชีของคุณ...</p></section>}
    {screen==='unavailable'&&<section className="card section" role="alert"><h2>ระบบบัญชียังไม่พร้อมใช้งาน</h2><p>ไม่สามารถตรวจสอบเซสชันหรือการเชื่อมต่อเซิร์ฟเวอร์ได้ โปรดลองใหม่ภายหลัง</p><button type="button" className="btn secondary" onClick={()=>window.location.reload()}>ลองใหม่</button></section>}
    {screen==='choose'&&<section className="card section">
      <span className="badge">เริ่มต้น StayHub</span>
      <h2>คุณดูแลที่พักประเภทไหน?</h2>
      <p className="lead">เลือกประเภทที่พักก่อนสมัครสมาชิก เพื่อให้ระบบเตรียมการตั้งค่าที่เหมาะกับคุณ</p>
      <div className="ownerTypeGrid">
        {(Object.keys(accommodationTypes) as AccommodationType[]).map(key=>
          <button type="button" className="ownerTypeTile" key={key} onClick={()=>chooseType(key)}>
            <span className="ownerTypeIcon" aria-hidden="true">{typeIcons[key]}</span>
            <strong>{accommodationTypes[key].label}</strong>
            <small>{typeDescriptions[key]}</small>
            <span className="ownerTypeNext">เลือกประเภทนี้ →</span>
          </button>
        )}
      </div>
      <p className="muted">มีบัญชีเจ้าของอยู่แล้ว? <button type="button" className="ownerTextButton" onClick={()=>{setAuthMode('login');setScreen('auth')}}>เข้าสู่ระบบ</button></p>
    </section>}
    {screen==='auth'&&!account&&<section className="card section">
      <span className="badge">ขั้นตอนที่ 2 · บัญชีเจ้าของ</span>
      <h2>{authMode==='register'?'สมัครสมาชิกเจ้าของที่พัก':'เข้าสู่ระบบ StayHub'}</h2>
      {authMode==='register'&&<div className="ownerChoiceSummary">
        <span aria-hidden="true">{typeIcons[type]}</span>
        <div><strong>{accommodationTypes[type].label}</strong><small>ประเภทที่เลือกไว้สำหรับที่พักแรก</small></div>
        <button type="button" className="ownerTextButton" onClick={changeType}>เปลี่ยน</button>
      </div>}
      <form className="list" onSubmit={e=>void sign(e,authMode)}>
        <label>อีเมล<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
        <label>รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)<span className="ownerPasswordField"><input type={showPassword?'text':'password'} autoComplete={authMode==='register'?'new-password':'current-password'} minLength={6} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} required/><button type="button" className="ownerPasswordToggle" aria-label={showPassword?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?'ซ่อน':'แสดง'}</button></span></label>
        <button type="submit" disabled={busy} className="btn">{authMode==='register'?'สมัครสมาชิกและดำเนินการต่อ':'เข้าสู่ระบบ'}</button>
      </form>
      <p className="muted">{authMode==='register'?'มีบัญชีแล้ว?':'ยังไม่มีบัญชี?'} <button type="button" className="ownerTextButton" onClick={()=>setAuthMode(authMode==='register'?'login':'register')}>{authMode==='register'?'เข้าสู่ระบบ':'สมัครสมาชิก'}</button></p>
    </section>}
    {screen==='dashboard'&&account&&<>
      <section className="card section">
        <div className="toolbar">
          <div><strong>เจ้าของที่พัก · {account.email}</strong><p className="muted">ประเภทที่พักและสิทธิ์ของแต่ละแห่งอ้างอิงจากบัญชี Cloud</p></div>
          <button type="button" className="btn secondary" disabled={busy} onClick={()=>void run(async()=>{
            await api('logout',{});setAccount(null);setProperties([]);setSelected('');setInvite(null);setScreen('auth');setAuthMode('login')
          })}>ออกจากระบบ</button>
        </div>
        {properties.length>0&&!showCreate&&<div className="list">
          <h2>ที่พักของฉัน</h2>
          {properties.filter(p=>['owner','admin'].includes(p.role)).map(p=>
            <div key={p.id} className="row"><strong>{p.name}</strong><span className="muted">{isAccommodationType(p.property_type)?accommodationTypes[p.property_type].label:'ที่พัก'}</span></div>
          )}
          <button type="button" className="btn secondary" onClick={()=>setShowCreate(true)}>+ เพิ่มที่พักอีกแห่ง</button>
        </div>}
        {(properties.length===0||showCreate)&&<>
          <h2>{properties.length===0?'ตั้งค่าที่พักแรกของคุณ':'เพิ่มที่พักใหม่'}</h2>
          <p className="muted">ประเภทที่พัก: <strong>{accommodationTypes[type].label}</strong></p>
          <form className="list" onSubmit={create}>
            <label>ชื่อที่พัก<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="เช่น บ้านสวน เรสซิเดนซ์"/></label>
            {properties.length>0&&<label>ประเภทสำหรับที่พักแห่งใหม่<select value={type} onChange={e=>setType(e.target.value as AccommodationType)}>
              {(Object.keys(accommodationTypes) as AccommodationType[]).map(key=><option key={key} value={key}>{accommodationTypes[key].label}</option>)}
            </select></label>}
            <div className="flow"><button disabled={busy} className="btn" type="submit">บันทึกที่พัก</button>
              {properties.length>0&&<button type="button" className="btn secondary" onClick={()=>setShowCreate(false)}>ยกเลิก</button>}
            </div>
          </form>
        </>}
      </section>
      <section className="card section"><h2>ห้องพักและผู้พัก</h2><p className="muted">เพิ่มห้อง ดูสถานะห้อง ย้ายห้อง และจัดการย้ายออก ผ่านฐานข้อมูล Cloud</p><a className="btn" href="/cloud/rooms">จัดการห้องพัก</a></section>
      <section className="card section"><h2>แจ้งซ่อม</h2><p className="muted">ดูรายการแจ้งซ่อม รับงาน นัดหมาย และปิดงานจากระบบ Cloud</p><a className="btn secondary" href="/cloud/repairs">จัดการงานซ่อม</a></section>
      <section className="card section"><h2>งานบริการและข้อมูลหอพัก</h2><p className="muted">ประกาศ พัสดุ รถของห้อง คนขับ เรียกรถ เอกสารข้อความ และราคาค่าใช้จ่าย</p><a className="btn secondary" href="/cloud/operations">จัดการงานบริการ</a></section>
      <section className="card section"><h2>ใบเสร็จรับเงิน</h2><p className="muted">ดูรายการชำระครบและพิมพ์ใบรับชำระเป็น PDF</p><a className="btn secondary" href="/cloud/receipts">เปิดใบเสร็จ</a></section>
      <section className="card section"><h2>รายงาน</h2><p className="muted">รายรับ ยอดค้าง และสถานะห้อง พร้อมส่งออก CSV</p><a className="btn secondary" href="/cloud/reports">เปิดรายงาน</a></section>
      <section className="card section"><h2>จัดการสัญญาเช่า</h2><p className="muted">ผูกผู้เช่าที่อนุมัติแล้วเข้ากับสัญญาเช่า ก่อนจดมิเตอร์และออกบิล</p><a className="btn" href="/cloud/leases">เปิดจัดการสัญญาเช่า</a></section>
      <section className="card section"><h2>ระบบบิลรายเดือน</h2><p className="muted">จดมิเตอร์ ออกบิล ดูยอดค้าง และรับเงินสด/โอน</p><a className="btn" href="/cloud/billing">เปิดระบบบิล</a></section>
      <section className="card section"><h2>QR เชิญผู้เช่า</h2>
        <label>เลือกที่พัก<select value={selected} onChange={e=>{setSelected(e.target.value);setInvite(null);setRequests([]);setInvites([]);setApproveUnit('');if(e.target.value){void loadUnits(e.target.value);void loadInvites(e.target.value)}}}>
          <option value="">-- เลือกที่พัก --</option>{properties.filter(p=>['owner','admin'].includes(p.role)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>
        {selected&&<div className="list section">
          <label>เพิ่มห้อง<input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="เช่น A101"/></label>
          <button type="button" disabled={busy||!unit.trim()} className="btn secondary" onClick={()=>void run(async()=>{await api('unit',{propertyId:selected,name:unit});setUnit('');await loadUnits(selected);setMessage('เพิ่มห้องสำเร็จ')})}>เพิ่มห้องพัก</button>
          <button disabled={busy} className="btn" onClick={()=>void run(async()=>{setInvite(await api('create-invite',{propertyId:selected}));await loadInvites(selected)})}>สร้าง QR ประจำที่พัก (7 วัน)</button>
          {invite&&<div className="card">
            <img src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(invite.svg)} width="260" height="260" alt="QR สำหรับเข้าร่วมที่พัก"/>
            <p><a href={invite.url}>{invite.url}</a></p>
            <p className="muted">QR ผูกกับที่พักนี้และบัญชีเจ้าของในฐานข้อมูลอัตโนมัติ สแกนแล้วรอการอนุมัติก่อนเข้าถึงข้อมูล</p>
          </div>}
          <section className="card"><h3>QR ที่สร้างแล้ว</h3>
            <p className="muted">ลิงก์ QR เดิมไม่สามารถดึงกลับมาได้ หลังออกจากหน้านี้ต้องสร้าง QR ใหม่เพื่อแชร์อีกครั้ง</p>
            {invites.map(item=><div className="row" key={item.id}>
              <div><strong>{item.revoked_at?'ยกเลิกแล้ว':new Date(item.expires_at)<=new Date()?'หมดอายุ':'ใช้งานได้'}</strong>
                <p className="muted">ใช้แล้ว {item.use_count}/{item.max_uses} · หมดอายุ {new Date(item.expires_at).toLocaleDateString('th-TH')}</p></div>
              {!item.revoked_at&&new Date(item.expires_at)>new Date()&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>void run(async()=>{
                await api('revoke-invite',{propertyId:selected,inviteId:item.id})
                if(invite?.id===item.id)setInvite(null)
                await loadInvites(selected)
                setMessage('ยกเลิก QR แล้ว')
              })}>ยกเลิก QR</button>}
            </div>)}
          </section>
          <button className="btn secondary" disabled={busy} onClick={()=>void loadRequests(selected)}>ดูคำขอเข้าร่วม</button>
          {requests.map(r=><div key={r.id} className="card">
            <p>{r.email} · {r.status} {r.unit_name||''}</p>
            {r.status==='pending'&&<div className="list"><label>เลือกห้องที่จะผูก<select value={approveUnit} onChange={e=>setApproveUnit(e.target.value)}><option value="">-- เลือกห้อง --</option>{units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
              <div className="flow">
                <button className="btn" disabled={busy||!approveUnit} onClick={()=>void run(async()=>{await api('approve',{propertyId:selected,requestId:r.id,unitId:approveUnit});await loadRequests(selected);setMessage('อนุมัติผูกห้องเรียบร้อยแล้ว')})}>อนุมัติผูกห้อง</button>
                <button className="btn secondary" disabled={busy} onClick={()=>void run(async()=>{await api('reject',{propertyId:selected,requestId:r.id});await loadRequests(selected);setMessage('ปฏิเสธคำขอแล้ว')})}>ปฏิเสธ</button>
              </div></div>}
          </div>)}
        </div>}
      </section>
    </>}
    {message&&<p role="status" className="card">{message}</p>}
  </main>
}
