'use client'
import { FormEvent,useEffect,useMemo,useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

export default function TenantRentalSelector(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [tenantId,setTenantId]=useState('')
  const [base,setBase]=useState(0)
  const [perRoom,setPerRoom]=useState(0)
  const [rooms,setRooms]=useState(0)
  const [status,setStatus]=useState('กำลังโหลด...')
  const [saving,setSaving]=useState(false)
  const roomAmount=rooms*perRoom
  const total=base+roomAmount

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('รอเชื่อมบัญชีแอดมิน OA');return}
    const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
    if(!profile||!['owner','admin','staff'].includes(profile.role)){setStatus('ไม่มีสิทธิ์');return}
    setTenantId(profile.tenant_id)
    const {data:tenant}=await supabase.from('tenants').select('rental_price_monthly,room_price_monthly,licensed_room_count').eq('id',profile.tenant_id).maybeSingle()
    setBase(Number(tenant?.rental_price_monthly||0));setPerRoom(Number(tenant?.room_price_monthly||0));setRooms(Number(tenant?.licensed_room_count||0));setStatus('เลือกจำนวนห้องที่ต้องการชำระ')
  })()},[supabase])

  const submit=async(e:FormEvent)=>{
    e.preventDefault();if(!tenantId)return
    setSaving(true);setStatus('กำลังส่งคำขอ...')
    const {data:{user}}=await supabase.auth.getUser()
    const {error}=await supabase.from('tenant_rental_requests').insert({tenant_id:tenantId,requested_by:user?.id||null,base_amount:base,room_unit_price:perRoom,room_count:rooms,room_amount:roomAmount,total_amount:total,status:'pending'})
    setSaving(false);setStatus(error?`ส่งไม่สำเร็จ: ${error.message}`:'ส่งยอดให้ Super Admin แล้ว')
  }

  return <form className="section card" onSubmit={submit}>
    <div className="toolbar"><div><h2>ค่าเช่าระบบ StayHub</h2><p className="muted">ค่าเช่าหลัก + ค่าต่อห้อง ระบบคำนวณให้อัตโนมัติ</p></div><span className="pill">{status}</span></div>
    <div className="metricGrid section">
      <div className="metric"><span className="muted">ค่าเช่าหลัก/เดือน</span><strong>{base.toLocaleString()} บาท</strong></div>
      <div className="metric"><span className="muted">ค่าต่อห้อง/เดือน</span><strong>{perRoom.toLocaleString()} บาท</strong></div>
      <div className="metric"><span className="muted">ค่าห้อง</span><strong>{roomAmount.toLocaleString()} บาท</strong></div>
      <div className="metric"><span className="muted">รวม/เดือน</span><strong>{total.toLocaleString()} บาท</strong></div>
    </div>
    <div className="formGrid"><label>จำนวนห้องที่ต้องการใช้งาน<input type="number" min="0" value={rooms} onChange={e=>setRooms(Math.max(0,Number(e.target.value)))}/></label></div>
    <div className="section"><button className="btn" disabled={!tenantId||saving}>{saving?'กำลังส่ง...':'แจ้งชำระ / ส่งให้ Super Admin'}</button></div>
  </form>
}
