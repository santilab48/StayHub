'use client'
import { FormEvent,useEffect,useMemo,useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

export default function TenantRentalSelector(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [tenantId,setTenantId]=useState('')
  const [base,setBase]=useState(0)
  const [perRoom,setPerRoom]=useState(0)
  const [rooms,setRooms]=useState(0)
  const [currentRooms,setCurrentRooms]=useState(0)
  const [months,setMonths]=useState(1)
  const [slip,setSlip]=useState<File|null>(null)
  const [status,setStatus]=useState('กำลังโหลด...')
  const [saving,setSaving]=useState(false)
  const roomAmount=rooms*perRoom
  const monthlyTotal=base+roomAmount
  const total=monthlyTotal*months
  const requestType=rooms===currentRooms?'renewal':'renewal_and_room_change'

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('รอเชื่อมบัญชีแอดมิน OA');return}
    const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
    if(!profile||!['owner','admin','staff'].includes(profile.role)){setStatus('ไม่มีสิทธิ์');return}
    setTenantId(profile.tenant_id)
    const {data:tenant}=await supabase.from('tenants').select('rental_price_monthly,room_price_monthly,licensed_room_count').eq('id',profile.tenant_id).maybeSingle()
    const licensed=Number(tenant?.licensed_room_count||0)
    setBase(Number(tenant?.rental_price_monthly||0));setPerRoom(Number(tenant?.room_price_monthly||0));setRooms(licensed);setCurrentRooms(licensed);setStatus('ต่ออายุหรือปรับจำนวนห้อง แล้วแนบสลิป')
  })()},[supabase])

  const submit=async(e:FormEvent)=>{
    e.preventDefault();if(!tenantId||!slip)return
    setSaving(true);setStatus('กำลังส่งยอดและสลิป...')
    const {data:{user}}=await supabase.auth.getUser()
    const {data:req,error}=await supabase.from('tenant_rental_requests').insert({tenant_id:tenantId,requested_by:user?.id||null,base_amount:base,room_unit_price:perRoom,room_count:rooms,room_amount:roomAmount,monthly_amount:monthlyTotal,renewal_months:months,total_amount:total,request_type:requestType,status:'pending'}).select('id').single()
    if(error||!req){setSaving(false);setStatus(`ส่งไม่สำเร็จ: ${error?.message||'สร้างคำขอไม่ได้'}`);return}
    const safeName=slip.name.replace(/[^a-zA-Z0-9._-]/g,'_')
    const path=`${tenantId}/${req.id}/${Date.now()}-${safeName}`
    const {error:uploadError}=await supabase.storage.from('stayhub-rental-slips').upload(path,slip,{upsert:false})
    if(uploadError){setSaving(false);setStatus(`สร้างคำขอแล้ว แต่แนบสลิปไม่สำเร็จ: ${uploadError.message}`);return}
    const {error:updateError}=await supabase.from('tenant_rental_requests').update({slip_path:path,slip_submitted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',req.id)
    setSaving(false)
    if(updateError){setStatus(`อัปโหลดสลิปแล้ว แต่บันทึกไม่สำเร็จ: ${updateError.message}`);return}
    setSlip(null);setStatus('ส่งยอด + สลิปให้ Super Admin ตรวจแล้ว')
  }

  return <form className="section card" onSubmit={submit}>
    <div className="toolbar"><div><h2>ต่ออายุ + ค่าห้อง</h2><p className="muted">ทำธุรกรรมค่าเช่าระบบจากแท็บทั่วไป ระบบคำนวณยอดแล้วส่งสลิปให้ Super Admin ตรวจ</p></div><span className="pill">{status}</span></div>
    <div className="metricGrid section">
      <div className="metric"><span className="muted">ค่าเช่าหลัก/เดือน</span><strong>{base.toLocaleString()} บาท</strong></div>
      <div className="metric"><span className="muted">ค่าต่อห้อง/เดือน</span><strong>{perRoom.toLocaleString()} บาท</strong></div>
      <div className="metric"><span className="muted">รวมต่อเดือน</span><strong>{monthlyTotal.toLocaleString()} บาท</strong></div>
      <div className="metric"><span className="muted">ยอดชำระทั้งหมด</span><strong>{total.toLocaleString()} บาท</strong></div>
    </div>
    <div className="formGrid">
      <label>จำนวนห้องที่ต้องการใช้<input type="number" min="0" value={rooms} onChange={e=>setRooms(Math.max(0,Number(e.target.value)))}/></label>
      <label>ต่ออายุกี่เดือน<select value={months} onChange={e=>setMonths(Math.max(1,Number(e.target.value)))}><option value={1}>1 เดือน</option><option value={3}>3 เดือน</option><option value={6}>6 เดือน</option><option value={12}>12 เดือน</option></select></label>
      <label>ค่าห้องต่อเดือน<input value={`${roomAmount.toLocaleString()} บาท`} readOnly/></label>
      <label>แนบสลิปชำระเงิน<input type="file" accept="image/*,application/pdf" required onChange={e=>setSlip(e.target.files?.[0]||null)}/></label>
    </div>
    <p className="muted">ปัจจุบันเปิดใช้ได้ {currentRooms} ห้อง · หากเปลี่ยนจำนวนห้อง Super Admin จะอัปเดตเพดานหลังตรวจสลิปและรับชำระ</p>
    <div className="section"><button className="btn" disabled={!tenantId||!slip||saving}>{saving?'กำลังส่ง...':'ส่งยอด + สลิปให้ Super Admin'}</button></div>
  </form>
}
