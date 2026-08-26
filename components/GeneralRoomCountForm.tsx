'use client'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

export default function GeneralRoomCountForm(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [tenantId,setTenantId]=useState('')
  const [count,setCount]=useState(0)
  const [status,setStatus]=useState('กำลังตรวจสิทธิ์...')
  const [saving,setSaving]=useState(false)

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('รอเชื่อมบัญชีเจ้าของ');return}
    const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
    if(!profile||!['owner','admin','staff'].includes(profile.role)){setStatus('ไม่มีสิทธิ์แก้ไข');return}
    setTenantId(profile.tenant_id)
    const {data:settings}=await supabase.from('tenant_settings').select('declared_room_count').eq('tenant_id',profile.tenant_id).maybeSingle()
    setCount(Number(settings?.declared_room_count||0))
    setStatus('พร้อมแก้ไข')
  })()},[supabase])

  const save=async(e:FormEvent)=>{
    e.preventDefault(); if(!tenantId)return
    setSaving(true); setStatus('กำลังบันทึก...')
    const {error}=await supabase.from('tenant_settings').upsert({tenant_id:tenantId,declared_room_count:count,updated_at:new Date().toISOString()},{onConflict:'tenant_id'})
    setSaving(false); setStatus(error?`บันทึกไม่สำเร็จ: ${error.message}`:'บันทึกจำนวนห้องแล้ว')
  }

  return <form onSubmit={save} className="card section">
    <div className="toolbar"><div><h2>จำนวนห้องทั้งหมด</h2><p className="muted">ใช้เป็นจำนวนห้องของหอสำหรับคำนวณห้องว่างในหน้า “สิ่งที่ต้องทำ”</p></div><span className="pill">{status}</span></div>
    <div className="formGrid"><label>จำนวนห้อง<input type="number" min="0" value={count} onChange={e=>setCount(Math.max(0,Number(e.target.value)))}/></label></div>
    <div className="section"><button className="btn" disabled={!tenantId||saving}>{saving?'กำลังบันทึก...':'บันทึกจำนวนห้อง'}</button></div>
  </form>
}
