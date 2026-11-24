'use client'
import {Suspense,useEffect,useState,type FormEvent} from 'react'
import {useSearchParams} from 'next/navigation'
import PwaInstall from '../../components/PwaInstall'
import styles from '../cloud/dashboard.module.css'
const INVITE_KEY='stayhub.tenant.invitation'
function JoinContent(){
 const params=useSearchParams()
 const token=params.get('token')||''
 const [item,setItem]=useState<{name:string;property_type:string;unit_name:string|null}|null>(null)
 const [status,setStatus]=useState('')
 const [busy,setBusy]=useState(false)
 const [authorized,setAuthorized]=useState(false)
 const [mode,setMode]=useState<'login'|'register'>('register')
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [ready,setReady]=useState(false)
 useEffect(()=>{
  let live=true
  async function load(){
   if(!token){setStatus('กรุณาสแกน QR ประจำห้อง');return}
   setBusy(true)
   try{
    const response=await fetch('/api/v2/invite?token='+encodeURIComponent(token),{cache:'no-store'})
    const data=await response.json()
    if(!response.ok)throw Error('คำเชิญหมดอายุหรือไม่ถูกต้อง กรุณาขอ QR ใหม่')
    if(!live)return
    setItem(data)
    try{localStorage.setItem(INVITE_KEY,token)}catch{}
    const me=await fetch('/api/v2/me',{cache:'no-store'})
    if(live){setAuthorized(me.ok);setReady(true)}
   }catch(e){if(live)setStatus(e instanceof Error?e.message:'เปิดคำเชิญไม่ได้')}
   finally{if(live)setBusy(false)}
  }
  void load()
  return()=>{live=false}
 },[token])
 async function linkRoom(){
  const res=await fetch('/api/v2/join',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})})
  const data=await res.json()
  if(res.ok||data.error==='existing'||data.error==='already_resident'){
   try{localStorage.removeItem(INVITE_KEY)}catch{}
   window.location.replace('/my');return
  }
  throw Error(data.error==='owner'?'บัญชีนี้เป็นเจ้าของที่พัก กรุณาออกจากระบบแล้วใช้บัญชีผู้เช่า':'ส่งคำขอผูกห้องไม่สำเร็จ กรุณาตรวจสอบคำเชิญ')
 }
 async function submit(e:FormEvent){
  e.preventDefault();if(busy)return
  setBusy(true);setStatus('')
  try{
   if(!authorized){
    const res=await fetch('/api/v2/'+mode,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})})
    if(!res.ok)throw Error(mode==='login'?'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน':'เปิดบัญชีผู้เช่าไม่สำเร็จ หากเคยมีบัญชีให้เลือกเข้าสู่ระบบ')
    setAuthorized(true);setPassword('')
   }
   await linkRoom()
  }catch(e){setStatus(e instanceof Error?e.message:'ดำเนินการไม่สำเร็จ')}
  finally{setBusy(false)}
 }
 return <main className={styles.detail}><div className={styles.detailInner} style={{maxWidth:560}}>
  <header className={styles.detailHeader}><strong className={styles.detailBrand}>StayHub <span>ผู้เช่า</span></strong></header>
  <section className="card section"><h1>{item?.unit_name?'ห้อง '+item.unit_name:'ติดตั้งแอปผู้เช่า'}</h1>
   {item&&<h2>{item.name}</h2>}
   {item&&<p>ระบบจำห้องจาก QR นี้แล้ว ไม่ต้องเลือกห้องใหม่</p>}
   {status&&<p role="alert">{status}</p>}
   {!item&&busy&&<p role="status">กำลังตรวจสอบ QR ประจำห้อง...</p>}
  </section>
  {item&&<PwaInstall/>}
  {item&&ready&&<section className="card section"><h2>เปิดใช้งานห้องของฉัน</h2><p className="muted">ติดตั้งได้ทันที จากนั้นยืนยันบัญชีผู้เช่าเพื่อส่งคำขอเข้าห้องนี้ ไม่ต้องสมัครเป็นเจ้าของที่พัก</p>
   <form className="list" onSubmit={submit}>
    {!authorized&&<><label>อีเมล<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>รหัสผ่าน<input type="password" required minLength={6} maxLength={128} autoComplete={mode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label></>}
    <button type="submit" className="btn" disabled={busy}>{busy?'กำลังดำเนินการ...':authorized?'ส่งคำขอเข้าห้องนี้':mode==='register'?'เปิดบัญชีผู้เช่าและผูกห้อง':'เข้าสู่ระบบและผูกห้อง'}</button>
    {!authorized&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>{setMode(v=>v==='register'?'login':'register');setStatus('')}}>{mode==='register'?'มีบัญชีผู้เช่าแล้ว':'ยังไม่มีบัญชีผู้เช่า'}</button>}
    {authorized&&<button type="button" className="btn secondary" disabled={busy} onClick={async()=>{setBusy(true);try{const res=await fetch('/api/v2/logout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});if(!res.ok)throw Error('ออกจากระบบไม่สำเร็จ');setAuthorized(false);setStatus('')}catch(e){setStatus(e instanceof Error?e.message:'ออกจากระบบไม่สำเร็จ')}finally{setBusy(false)}}}>เปลี่ยนบัญชีผู้เช่า</button>}
   </form><p className="muted">ข้อมูลห้องส่วนตัวและบิลจะเปิดหลังเจ้าของอนุมัติเท่านั้น</p>
  </section>}
 </div></main>
}
export default function JoinPage(){return <Suspense fallback={<main>กำลังเปิดคำเชิญ...</main>}><JoinContent/></Suspense>}
