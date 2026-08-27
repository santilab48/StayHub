'use client'

import {FormEvent,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../../lib/supabase-browser'

const tenantSlug='stayhub-demo'

export default function SetupOwnerPage(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [status,setStatus]=useState('ใช้บัญชีที่สมัครไว้ เข้าหลังบ้านได้ทันที ไม่ต้องรออีเมล')
  const [busy,setBusy]=useState(false)

  const openAdmin=async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('กรุณาเข้าสู่ระบบก่อน');return false}

    const {data:profile,error}=await supabase
      .from('profiles')
      .select('role,tenant_id,tenants!inner(slug)')
      .eq('auth_user_id',user.id)
      .maybeSingle()

    if(error){setStatus(`ตรวจสิทธิ์ไม่สำเร็จ: ${error.message}`);return false}

    const tenant=(profile as {tenants?:{slug?:string}|{slug?:string}[]}|null)?.tenants
    const slug=Array.isArray(tenant)?tenant[0]?.slug:tenant?.slug
    if(profile && ['owner','admin'].includes(profile.role) && slug===tenantSlug){
      window.location.href=`/t/${tenantSlug}/admin/general`
      return true
    }

    setStatus('บัญชีนี้ยังไม่ได้รับสิทธิ์เจ้าบ้าน')
    return false
  }

  const signIn=async(e:FormEvent)=>{
    e.preventDefault()
    if(!email||!password){setStatus('กรอกอีเมลและรหัสผ่าน');return}
    setBusy(true);setStatus('กำลังเข้าสู่หลังบ้าน...')
    const {error}=await supabase.auth.signInWithPassword({email,password})
    if(error){setBusy(false);setStatus(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);return}
    await openAdmin()
    setBusy(false)
  }

  return <main className="container">
    <section className="card" style={{maxWidth:640,margin:'48px auto'}}>
      <h1>🏠 เข้า StayHub Demo</h1>
      <p className="muted">อาคาร A · ห้อง A201 พร้อมให้ลองกรอกข้อมูลในแท็บ “ทั่วไป” แล้ว</p>
      <form onSubmit={signIn}>
        <div className="formGrid section">
          <label className="span2">อีเมล<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
          <label className="span2">รหัสผ่าน<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
        </div>
        <div className="noticeBox card"><strong>สถานะ</strong><p className="muted">{status}</p></div>
        <div className="toolbar section">
          <button className="btn" disabled={busy||!email||!password}>{busy?'กำลังเข้า...':'เข้าหลังบ้าน'}</button>
        </div>
      </form>
      <p className="muted">ไม่ต้องยืนยันอีเมลและไม่ต้องสมัครใหม่สำหรับบัญชีทดสอบนี้</p>
    </section>
  </main>
}
