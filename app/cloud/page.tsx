'use client'
import {FormEvent,useEffect,useState} from 'react'
import {accommodationTypes,isAccommodationType,type AccommodationType} from '../../lib/accommodation-types'
import authStyles from './auth.module.css'
import dashboardStyles from './dashboard.module.css'
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
type RequestItem={id:string;email:string;status:string;unit_name:string|null;unit_id:string|null;device_id:string|null;device_revoked_at:string|null}
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
  const [dashboardTab,setDashboardTab]=useState<'property'|'residents'|'finance'|'services'|'membership'>('property')
  const [account,setAccount]=useState<{email:string}|null>(null)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [name,setName]=useState('')
  const [type,setType]=useState<AccommodationType>('apartment')
  const [screen,setScreen]=useState<OnboardingScreen>('loading')
  const [authMode,setAuthMode]=useState<'register'|'login'>('register')
  const [properties,setProperties]=useState<Property[]>([])
  const [selected,setSelected]=useState('')
  const [qrUnit,setQrUnit]=useState('')
  const [invite,setInvite]=useState<{id:string;url:string;svg:string;roomName:string}|null>(null)
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
      const requestedTab=entry.get('tab')
      if(requestedTab==='property'||requestedTab==='residents'||requestedTab==='finance'||requestedTab==='services'||requestedTab==='membership')setDashboardTab(requestedTab)
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
  async function run(fn:()=>Promise<void>){setBusy(true);setMessage('');try{await fn()}catch(e){setMessage(e instanceof Error?e.message:'เกิดข้อผิดพลาด')}finally{setBusy(false)}}
  async function sign(e:{preventDefault:()=>void},action:'register'|'login'){e.preventDefault();await run(async()=>{await api(action,{email,password});setPassword('');setShowPassword(false);await load();setMessage('เข้าสู่ระบบสำเร็จ');const target=new URLSearchParams(window.location.search).get('return');if(target?.startsWith('/join?token='))window.location.assign(target)})}
  async function create(e:FormEvent){e.preventDefault();await run(async()=>{if(properties.some(p=>['owner','admin'].includes(p.role)))throw Error('หนึ่งสมาชิกสามารถจัดการที่พักได้หนึ่งแห่ง');const p=await api('property',{name,type});await load();setSelected(p.id);setMessage('สร้างที่พักแล้ว');await loadUnits(p.id);await loadInvites(p.id)})}
  async function loadUnits(id:string){const r=await fetch('/api/v2/units?propertyId='+encodeURIComponent(id),{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error);setUnits(data.items)}
  async function loadInvites(id:string){const r=await fetch('/api/v2/invites?propertyId='+encodeURIComponent(id),{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error);setInvites(data.items)}
  const managedProperty=properties.find(p=>p.role==='owner')||properties.find(p=>p.role==='admin')
  const managedId=managedProperty?.id||''
  useEffect(()=>{
    let active=true
    setSelected(managedId);setQrUnit('');setInvite(null);setUnits([]);setInvites([]);setRequests([]);setApproveUnit('')
    if(managedId){
      Promise.all([api('units?propertyId='+encodeURIComponent(managedId)),api('invites?propertyId='+encodeURIComponent(managedId)),api('requests?propertyId='+encodeURIComponent(managedId))]).then(([u,i,r])=>{if(active){setUnits(u.items);setInvites(i.items);setRequests(r.items)}}).catch(e=>{if(active)setMessage(e instanceof Error?e.message:'โหลดข้อมูลห้องไม่สำเร็จ')})
    }
    return()=>{active=false}
  },[managedId])
  async function loadRequests(id:string){await run(async()=>{const r=await fetch('/api/v2/requests?propertyId='+encodeURIComponent(id),{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error);setRequests(data.items)})}
  return <main className={screen==='choose'?'wrap ownerEntryPage ownerDarkEntry':screen==='auth'?authStyles.shell:screen==='dashboard'?dashboardStyles.shell:'wrap'} style={{maxWidth:screen==='auth'||screen==='dashboard'?undefined:screen==='choose'?1240:900}}>
    {screen==='dashboard'?null:screen==='auth'?<a className={authStyles.homeLink} href="/" aria-label="กลับหน้าแรก">หน้าแรก</a>:<a className="ownerBackLink" href="/">กลับหน้าเลือกประเภทที่พัก</a>}
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
    {screen==='auth'&&!account&&<section className={authStyles.panel} aria-labelledby="ownerAuthTitle">
      <div className={authStyles.heading}>
        <span className={authStyles.overline}>StayHub</span>
        <h1 id="ownerAuthTitle">{authMode==='register'?'สมัครสมาชิก':'เข้าสู่ระบบ'}</h1>
        <p>{authMode==='register'?'สมัครบัญชีเพื่อเริ่มใช้งาน StayHub':'เข้าสู่ระบบเพื่อจัดการที่พักของคุณ'}</p>
      </div>
      <form className={authStyles.form} onSubmit={e=>void sign(e,authMode)}>
        <label htmlFor="owner-email">อีเมล
          <input id="owner-email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
        </label>
        <label htmlFor="owner-password">รหัสผ่าน
          <span className={authStyles.passwordField}>
            <input id="owner-password" type={showPassword?'text':'password'} autoComplete={authMode==='register'?'new-password':'current-password'} minLength={6} maxLength={128} placeholder={authMode==='register'?'อย่างน้อย 6 ตัวอักษร':'กรอกรหัสผ่าน'} value={password} onChange={e=>setPassword(e.target.value)} required/>
            <button type="button" className={authStyles.passwordToggle} aria-label={showPassword?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{showPassword?<><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A11 11 0 0 1 12 5c6 0 10 7 10 7a16 16 0 0 1-3.2 3.8M6.2 6.2C3.6 8.2 2 12 2 12s4 7 10 7a10 10 0 0 0 4.2-.9"/></>:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>}</svg></button>
          </span>
        </label>
        <button type="submit" disabled={busy} className={authStyles.submit}>{busy?'กำลังดำเนินการ...':authMode==='register'?'สร้างบัญชีและดำเนินการต่อ':'เข้าสู่ระบบ'}</button>
      </form>
      <p className={authStyles.switch}>{authMode==='register'?'มีบัญชีอยู่แล้ว?':'ยังไม่มีบัญชี?'} <button type="button" className={authStyles.linkButton} onClick={()=>{setAuthMode(authMode==='register'?'login':'register');setMessage('')}}>{authMode==='register'?'เข้าสู่ระบบ':'สมัครสมาชิก'}</button></p>
    </section>}
    {screen==='dashboard'&&account&&<div className={dashboardStyles.workspace}>
      <header className={dashboardStyles.header}>
        <div><a href="/" className={dashboardStyles.brand}>StayHub <span>Cloud</span></a><p className={dashboardStyles.subtitle}>พื้นที่จัดการที่พักของคุณ</p></div>
        <div className={dashboardStyles.account}><span>{properties.find(p=>p.role==='owner')?.name||properties.find(p=>p.role==='admin')?.name||account.email}</span><button type="button" className={dashboardStyles.logout} disabled={busy} onClick={()=>void run(async()=>{await api('logout',{});setAccount(null);setProperties([]);setSelected('');setInvite(null);setDashboardTab('property');setScreen('auth');setAuthMode('login')})}>ออกจากระบบ</button></div>
      </header>
      <nav className={dashboardStyles.tabs} aria-label="หมวดจัดการที่พัก"><button key="property" type="button" className={dashboardStyles.tab} aria-pressed={dashboardTab==='property'} onClick={()=>setDashboardTab('property')}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V5l7-3 7 3v16M9 9h1m4 0h1M9 13h1m4 0h1M10 21v-4h4v4"/></svg><span>ที่พัก</span></button>
<button key="residents" type="button" className={dashboardStyles.tab} aria-pressed={dashboardTab==='residents'} onClick={()=>setDashboardTab('residents')}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20V5m0 11h18v4M3 10h6a3 3 0 0 1 3 3v3m0-6h6a3 3 0 0 1 3 3v3"/></svg><span>ห้องพักและผู้เช่า</span></button>
<button key="finance" type="button" className={dashboardStyles.tab} aria-pressed={dashboardTab==='finance'} onClick={()=>setDashboardTab('finance')}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3M8 8h8m-8 4h8m-8 4h4"/></svg><span>การเงิน</span></button>
<button key="services" type="button" className={dashboardStyles.tab} aria-pressed={dashboardTab==='services'} onClick={()=>setDashboardTab('services')}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 6a5 5 0 0 0-6 6L3 17l4 4 5-5a5 5 0 0 0 6-6l-4 4-4-4 4-4Z"/></svg><span>งานบริการ</span></button>
<button key="membership" type="button" className={dashboardStyles.tab} aria-pressed={dashboardTab==='membership'} onClick={()=>setDashboardTab('membership')}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/></svg><span>สมาชิก</span></button></nav>
      <div className={dashboardStyles.content} aria-label="เนื้อหาหมวดที่เลือก">
        <div hidden={dashboardTab!=='property'} className={dashboardStyles.grid}>
          <section className="card section">
            {properties.some(p=>['owner','admin'].includes(p.role))?<div className="list">
              <h2>ที่พักของฉัน</h2>
              {properties.filter(p=>['owner','admin'].includes(p.role)).map(p=><div key={p.id} className="row"><strong>{p.name}</strong><span className="muted">{isAccommodationType(p.property_type)?accommodationTypes[p.property_type].label:'ที่พัก'}</span></div>)}
            </div>:<>
              <h2>ตั้งค่าที่พักของคุณ</h2>
              <p className="muted">ประเภทที่พัก: <strong>{accommodationTypes[type].label}</strong></p>
              <form className="list" onSubmit={create}>
                <label>ชื่อที่พัก<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="เช่น บ้านสวน เรสซิเดนซ์"/></label>
                <div className="flow"><button disabled={busy||!name.trim()} className="btn" type="submit">บันทึกที่พัก</button></div>
              </form>
            </>}
          </section>
        </div>
        <div hidden={dashboardTab!=='residents'} className={dashboardStyles.grid}><section className="card section"><h2>ห้องพักและผู้พัก</h2><p className="muted">เพิ่มห้อง ดูสถานะห้อง ย้ายห้อง และจัดการย้ายออก ผ่านฐานข้อมูล Cloud</p><a className="btn" href="/cloud/rooms">จัดการห้องพัก</a></section><section className="card section"><h2>จัดการสัญญาเช่า</h2><p className="muted">ผูกผู้เช่าที่อนุมัติแล้วเข้ากับสัญญาเช่า ก่อนจดมิเตอร์และออกบิล</p><a className="btn" href="/cloud/leases">เปิดจัดการสัญญาเช่า</a></section><div className={dashboardStyles.full}><section className="card section"><h2>QR เชิญผู้เช่า</h2>
        <p className="muted">สร้าง QR เฉพาะห้อง ผู้เช่าสแกนแล้วระบบจำห้องที่เชิญให้อัตโนมัติ</p>
        {!selected?<p className="muted">กรุณาตั้งชื่อที่พักก่อนสร้าง QR</p>:<div className="list">
          <div className={dashboardStyles.qrSetup}>
            <div><label>เลือกห้องที่จะเชิญ<select value={qrUnit} onChange={e=>{setQrUnit(e.target.value);setInvite(null)}}><option value="">เลือกเลขห้อง</option>{units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label></div>
            <div className={dashboardStyles.qrExpiry}><small>อายุ QR อัตโนมัติ</small><strong>1 ปี</strong></div>
            <button type="button" disabled={busy||!qrUnit} className="btn" onClick={()=>void run(async()=>{const room=units.find(u=>u.id===qrUnit);if(!room)return;const result=await api('create-invite',{propertyId:selected,unitId:room.id});setInvite({...result,roomName:room.name});await loadInvites(selected)})}>สร้าง QR ประจำห้อง</button>
          </div>
          {!units.length&&<p className="muted">ยังไม่มีห้อง <a href="/cloud/rooms">เพิ่มห้องพักก่อน</a></p>}
          {invite&&<div className={dashboardStyles.qrResult}>
            <strong>{managedProperty?.name} · ห้อง {invite.roomName}</strong>
            <img src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(invite.svg)} width="260" height="260" alt={'QR ห้อง '+invite.roomName}/>
            <a className="btn" download={'StayHub-'+invite.roomName+'.svg'} href={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(invite.svg)}>บันทึก QR</a>
            <button type="button" className="btn secondary" onClick={()=>void run(async()=>{await navigator.clipboard.writeText(invite.url);setMessage('คัดลอกลิงก์แล้ว')})}>คัดลอกลิงก์</button>
            <p className="muted">ผู้เช่าติดตั้งแอปและเปิดดูห้องได้ตามสิทธิ์ที่เจ้าของอนุมัติ</p>
          </div>}
          <section className="card"><h3>QR ที่สร้างแล้ว</h3>
            <p className="muted">ลิงก์ QR เดิมไม่สามารถดึงกลับมาได้ หลังออกจากหน้านี้ต้องสร้าง QR ใหม่เพื่อแชร์อีกครั้ง</p>
            {invites.map(item=><div className="row" key={item.id}>
              <div><strong>{units.find(u=>u.id===item.unit_id)?.name||'QR เดิม'} · {item.revoked_at?'ยกเลิกแล้ว':new Date(item.expires_at)<=new Date()?'หมดอายุ':'ใช้งานได้'}</strong>
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
            {r.status==='pending'&&<div className="list">{r.unit_id?<strong>ห้อง {r.unit_name}</strong>:<label>เลือกห้องที่จะผูก<select value={approveUnit} onChange={e=>setApproveUnit(e.target.value)}><option value="">-- เลือกห้อง --</option>{units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>}
              <div className="flow">
                <button className="btn" disabled={busy||!(r.unit_id||approveUnit)} onClick={()=>void run(async()=>{await api('approve',{propertyId:selected,requestId:r.id,unitId:r.unit_id||approveUnit});await loadRequests(selected);setMessage('อนุมัติผูกห้องเรียบร้อยแล้ว')})}>อนุมัติผูกห้อง</button>
                <button className="btn secondary" disabled={busy} onClick={()=>void run(async()=>{await api('reject',{propertyId:selected,requestId:r.id});await loadRequests(selected);setMessage('ปฏิเสธคำขอแล้ว')})}>ปฏิเสธ</button>
              </div></div>}
            {r.device_id&&r.status==='approved'&&!r.device_revoked_at&&<button className="btn secondary" disabled={busy} onClick={()=>void run(async()=>{await api('revoke-tenant-device',{propertyId:selected,deviceId:r.device_id});await loadRequests(selected);setMessage('ยกเลิกสิทธิ์อุปกรณ์แล้ว')})}>ยกเลิกสิทธิ์อุปกรณ์</button>}
          </div>)}
        </div>}
      </section>
</div></div>
        <div hidden={dashboardTab!=='finance'} className={dashboardStyles.grid}><section className="card section"><h2>ระบบบิลรายเดือน</h2><p className="muted">จดมิเตอร์ ออกบิล ดูยอดค้าง และรับเงินสด/โอน</p><a className="btn" href="/cloud/billing">เปิดระบบบิล</a></section><section className="card section"><h2>ใบเสร็จรับเงิน</h2><p className="muted">ดูรายการชำระครบและพิมพ์ใบรับชำระเป็น PDF</p><a className="btn secondary" href="/cloud/receipts">เปิดใบเสร็จ</a></section><section className="card section"><h2>รายงาน</h2><p className="muted">รายรับ ยอดค้าง และสถานะห้อง พร้อมส่งออก CSV</p><a className="btn secondary" href="/cloud/reports">เปิดรายงาน</a></section></div>
        <div hidden={dashboardTab!=='services'} className={dashboardStyles.grid}><section className="card section"><h2>แจ้งซ่อม</h2><p className="muted">ดูรายการแจ้งซ่อม รับงาน นัดหมาย และปิดงานจากระบบ Cloud</p><a className="btn secondary" href="/cloud/repairs">จัดการงานซ่อม</a></section><section className="card section"><h2>งานบริการและข้อมูลหอพัก</h2><p className="muted">ประกาศ พัสดุ รถของห้อง คนขับ เรียกรถ เอกสารข้อความ และราคาค่าใช้จ่าย</p><a className="btn secondary" href="/cloud/operations">จัดการงานบริการ</a></section></div>
        <div hidden={dashboardTab!=='membership'} className={dashboardStyles.grid}><section className="card section"><h2>สมาชิกและสิทธิพิเศษ</h2><p className="muted">ตรวจสอบสถานะแพ็กเกจ วันหมดอายุ และสิทธิพิเศษของบัญชีนี้จากระบบสมาชิก</p><a className="btn secondary" href="/membership">ดูสถานะสมาชิก</a></section></div>
      </div>
    </div>}
    {message&&<p role="status" className={screen==='auth'?authStyles.message:screen==='dashboard'?dashboardStyles.message:'card'}>{message}</p>}
  </main>
}
