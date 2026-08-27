'use client'

import {FormEvent,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../../lib/supabase-browser'

const tenantSlug='stayhub-demo'

export default function SetupOwnerPage(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [fullName,setFullName]=useState('เจ้าบ้าน')
  const [status,setStatus]=useState('สร้างบัญชีหรือเข้าสู่ระบบ แล้วระบบจะผูกสิทธิ์เจ้าบ้านให้ StayHub Demo')
  const [busy,setBusy]=useState(false)

  const claim=async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('ยังไม่มี session กรุณายืนยันอีเมลแล้วเข้าสู่ระบบ');return false}
    const {error}=await supabase.rpc('claim_first_owner',{p_tenant_slug:tenantSlug,p_full_name:fullName||'เจ้าบ้าน'})
    if(error){
      if(error.message.includes('OWNER_ALREADY_EXISTS')) setStatus('หอนี้มีเจ้าบ้านแล้ว กรุณาใช้บัญชีเจ้าบ้านเดิมเข้าสู่ระบบ')
      else setStatus(`ผูกสิทธิ์ไม่สำเร็จ: ${error.message}`)
      return false
    }
    window.location.href=`/t/${tenantSlug}/admin/general`
    return true
  }

  const signIn=async(e:FormEvent)=>{
    e.preventDefault();setBusy(true);setStatus('กำลังเข้าสู่ระบบ...')
    const {error}=await supabase.auth.signInWithPassword({email,password})
    if(error){setBusy(false);setStatus(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);return}
    setStatus('เข้าสู่ระบบแล้ว กำลังผูกสิทธิ์เจ้าบ้าน...')
    await claim();setBusy(false)
  }

  const signUp=async()=>{
    if(!email||password.length<6){setStatus('กรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัว');return}
    setBusy(true);setStatus('กำลังสร้างบัญชี...')
    const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName}}})
    if(error){setBusy(false);setStatus(`สมัครไม่สำเร็จ: ${error.message}`);return}
    if(data.session){setStatus('สร้างบัญชีแล้ว กำลังผูกสิทธิ์เจ้าบ้าน...');await claim()}
    else setStatus('สร้างบัญชีแล้ว กรุณาเปิดอีเมลยืนยัน จากนั้นกลับมาหน้านี้และกด “เข้าสู่ระบบ + เปิดหลังบ้าน”')
    setBusy(false)
  }

  return <main className="container">
    <section className="card" style={{maxWidth:640,margin:'48px auto'}}>
      <h1>🏠 ตั้งเจ้าบ้านครั้งแรก</h1>
      <p className="muted">StayHub Demo · อาคาร A · ห้อง A201 เตรียมไว้แล้ว บัญชีแรกที่รับสิทธิ์สำเร็จจะเป็นเจ้าบ้านของหอนี้</p>
      <div className="formGrid section">
        <label className="span2">ชื่อเจ้าบ้าน<input value={fullName} onChange={e=>setFullName(e.target.value)} /></label>
        <label className="span2">อีเมล<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        <label className="span2">รหัสผ่าน<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required /></label>
      </div>
      <div className="noticeBox card"><strong>สถานะ</strong><p className="muted">{status}</p></div>
      <form onSubmit={signIn} className="toolbar section">
        <button type="button" className="btn secondary" disabled={busy} onClick={signUp}>สร้างบัญชีเจ้าบ้าน</button>
        <button className="btn" disabled={busy||!email||!password}>{busy?'กำลังทำรายการ...':'เข้าสู่ระบบ + เปิดหลังบ้าน'}</button>
      </form>
      <p className="muted">ระบบไม่เก็บรหัสผ่านในตาราง StayHub รหัสผ่านอยู่ใน Supabase Auth เท่านั้น</p>
    </section>
  </main>
}
