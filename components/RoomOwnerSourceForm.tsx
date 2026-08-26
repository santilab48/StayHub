'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

type Room = { id:string; room_no:string; floor:string|null; status:string|null }
type Portal = {
  delivery_address:string|null; postal_code:string|null; office_phone:string|null; security_phone:string|null; emergency_phone:string|null;
  line_contact_url:string|null; wifi_ssid:string|null; wifi_password:string|null; wifi_note:string|null; move_in_date:string|null;
  keys_issued:number; keycards_issued:number; handover_condition:string|null; move_out_notice_date:string|null; inspection_date:string|null;
  move_out_status:string; owner_note:string|null;
}

const blank:Portal={delivery_address:'',postal_code:'',office_phone:'',security_phone:'',emergency_phone:'',line_contact_url:'',wifi_ssid:'',wifi_password:'',wifi_note:'',move_in_date:'',keys_issued:0,keycards_issued:0,handover_condition:'',move_out_notice_date:'',inspection_date:'',move_out_status:'none',owner_note:''}

export default function RoomOwnerSourceForm(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [rooms,setRooms]=useState<Room[]>([])
  const [roomId,setRoomId]=useState('')
  const [tenantId,setTenantId]=useState('')
  const [data,setData]=useState<Portal>(blank)
  const [status,setStatus]=useState('กำลังตรวจสิทธิ์...')
  const [saving,setSaving]=useState(false)

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('ยังไม่ได้เชื่อมบัญชีเจ้าของ — ฟอร์มพร้อมแล้ว แต่จะบันทึกได้หลังเชื่อม LINE Login');return}
    const {data:profile,error:pErr}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).single()
    if(pErr||!profile){setStatus('ไม่พบโปรไฟล์เจ้าของใน tenant นี้');return}
    if(!['owner','admin','staff'].includes(profile.role)){setStatus('บัญชีนี้ไม่มีสิทธิ์แก้ข้อมูลห้อง');return}
    setTenantId(profile.tenant_id)
    const {data:roomRows,error:rErr}=await supabase.from('rooms').select('id,room_no,floor,status').eq('tenant_id',profile.tenant_id).order('room_no')
    if(rErr){setStatus('โหลดรายการห้องไม่สำเร็จ');return}
    setRooms(roomRows||[])
    if(roomRows?.length){setRoomId(roomRows[0].id)}
    setStatus('พร้อมแก้ไขข้อมูล')
  })()},[supabase])

  useEffect(()=>{if(!roomId||!tenantId)return;(async()=>{
    const {data:row}=await supabase.from('room_portal_settings').select('*').eq('tenant_id',tenantId).eq('room_id',roomId).maybeSingle()
    setData(row?{...blank,...row}:blank)
  })()},[roomId,tenantId,supabase])

  const set=(key:keyof Portal,value:string|number)=>setData(v=>({...v,[key]:value}))
  const save=async(e:FormEvent)=>{
    e.preventDefault(); if(!roomId||!tenantId)return
    setSaving(true); setStatus('กำลังบันทึก...')
    const payload={...data,tenant_id:tenantId,room_id:roomId,updated_at:new Date().toISOString()}
    const {error}=await supabase.from('room_portal_settings').upsert(payload,{onConflict:'tenant_id,room_id'})
    setSaving(false)
    setStatus(error?`บันทึกไม่สำเร็จ: ${error.message}`:'บันทึกแล้ว — หน้า ห้องของฉัน พร้อมดึงข้อมูลชุดนี้')
  }

  return <form onSubmit={save} className="section">
    <section className="card">
      <div className="toolbar"><div><h2>เลือกห้อง</h2><p className="muted">ข้อมูลทุกช่องผูก tenant_id + room_id ไม่ใช้เลขห้องเป็น key เดี่ยว</p></div><span className="pill">{status}</span></div>
      <div className="formGrid"><label>ห้อง<select value={roomId} onChange={e=>setRoomId(e.target.value)} disabled={!rooms.length}><option value="">เลือกห้อง</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.room_no}{r.floor?` · ชั้น ${r.floor}`:''}</option>)}</select></label><label>สถานะฟอร์ม<input value={tenantId?'เชื่อม tenant แล้ว':'รอเชื่อมบัญชีเจ้าของ'} readOnly/></label></div>
    </section>

    <section className="card section"><h2>ที่อยู่จัดส่ง + ติดต่อหอ</h2><div className="formGrid">
      <label className="span2">ที่อยู่จัดส่งหลัก<textarea value={data.delivery_address||''} onChange={e=>set('delivery_address',e.target.value)} placeholder="ชื่อหอ เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด"/></label>
      <label>รหัสไปรษณีย์<input value={data.postal_code||''} onChange={e=>set('postal_code',e.target.value)}/></label><label>เบอร์สำนักงาน / เจ้าของ<input value={data.office_phone||''} onChange={e=>set('office_phone',e.target.value)}/></label>
      <label>เบอร์ รปภ.<input value={data.security_phone||''} onChange={e=>set('security_phone',e.target.value)}/></label><label>เบอร์ฉุกเฉิน<input value={data.emergency_phone||''} onChange={e=>set('emergency_phone',e.target.value)}/></label>
      <label className="span2">ลิงก์ LINE ติดต่อหอ<input value={data.line_contact_url||''} onChange={e=>set('line_contact_url',e.target.value)} placeholder="https://line.me/..."/></label>
    </div></section>

    <section className="card section"><h2>Wi‑Fi ห้อง</h2><div className="formGrid"><label>ชื่อ Wi‑Fi<input value={data.wifi_ssid||''} onChange={e=>set('wifi_ssid',e.target.value)}/></label><label>รหัสผ่าน<input value={data.wifi_password||''} onChange={e=>set('wifi_password',e.target.value)}/></label><label className="span2">หมายเหตุ<textarea value={data.wifi_note||''} onChange={e=>set('wifi_note',e.target.value)}/></label></div></section>

    <section className="card section"><h2>รับมอบห้อง</h2><div className="formGrid"><label>วันที่เข้าอยู่<input type="date" value={data.move_in_date||''} onChange={e=>set('move_in_date',e.target.value)}/></label><label>จำนวนกุญแจ<input type="number" min="0" value={data.keys_issued} onChange={e=>set('keys_issued',Number(e.target.value))}/></label><label>จำนวน Key Card<input type="number" min="0" value={data.keycards_issued} onChange={e=>set('keycards_issued',Number(e.target.value))}/></label><label>สภาพห้องตอนรับมอบ<input value={data.handover_condition||''} onChange={e=>set('handover_condition',e.target.value)}/></label></div></section>

    <section className="card section"><h2>ย้ายออก</h2><div className="formGrid"><label>วันที่แจ้งย้ายออก<input type="date" value={data.move_out_notice_date||''} onChange={e=>set('move_out_notice_date',e.target.value)}/></label><label>วันนัดตรวจห้อง<input type="date" value={data.inspection_date||''} onChange={e=>set('inspection_date',e.target.value)}/></label><label>สถานะ<select value={data.move_out_status} onChange={e=>set('move_out_status',e.target.value)}><option value="none">ยังไม่แจ้ง</option><option value="notice_given">แจ้งแล้ว</option><option value="inspection_scheduled">นัดตรวจห้องแล้ว</option><option value="moving_out">กำลังย้ายออก</option><option value="completed">สิ้นสุดการเข้าพัก</option></select></label><label>หมายเหตุเจ้าของ<input value={data.owner_note||''} onChange={e=>set('owner_note',e.target.value)}/></label></div></section>

    <section className="card section"><div className="toolbar"><div><strong>ทรัพย์สินในห้อง</strong><p className="muted">รายการแอร์ เตียง ตู้ โต๊ะ ทีวี ฯลฯ เก็บใน room_inventory_items แยก เพื่อเพิ่ม/ลดได้โดยไม่แก้ข้อมูลหลักห้อง</p></div><a className="btn secondary" href="#inventory">จัดการทรัพย์สิน</a></div></section>

    <div className="section"><button className="btn" disabled={saving||!tenantId||!roomId}>{saving?'กำลังบันทึก...':'บันทึกข้อมูล ห้องของฉัน'}</button></div>
  </form>
}
