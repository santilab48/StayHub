'use client'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

export default function GeneralRoomCountForm(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [tenantId,setTenantId]=useState('')
  const [count,setCount]=useState(0)
  const [prefix,setPrefix]=useState('A')
  const [start,setStart]=useState(301)
  const [digits,setDigits]=useState(0)
  const [format,setFormat]=useState('{prefix}{number}')
  const [status,setStatus]=useState('กำลังตรวจสิทธิ์...')
  const [saving,setSaving]=useState(false)

  const sampleNumber=useMemo(()=>{
    const n=digits>0?String(start).padStart(digits,'0'):String(start)
    return format.replace('{prefix}',prefix).replace('{number}',n)
  },[prefix,start,digits,format])

  const preview=useMemo(()=>Array.from({length:Math.min(Math.max(count,1),5)},(_,i)=>{
    const value=start+i
    const n=digits>0?String(value).padStart(digits,'0'):String(value)
    return format.replace('{prefix}',prefix).replace('{number}',n)
  }),[count,start,digits,prefix,format])

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('รอเชื่อมบัญชีเจ้าของ');return}
    const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
    if(!profile||!['owner','admin','staff'].includes(profile.role)){setStatus('ไม่มีสิทธิ์แก้ไข');return}
    setTenantId(profile.tenant_id)
    const {data:settings}=await supabase.from('tenant_settings').select('declared_room_count,room_number_format,room_number_prefix,room_number_start,room_number_digits').eq('tenant_id',profile.tenant_id).maybeSingle()
    setCount(Number(settings?.declared_room_count||0))
    if(settings?.room_number_prefix!=null)setPrefix(settings.room_number_prefix)
    if(settings?.room_number_start!=null)setStart(Number(settings.room_number_start))
    if(settings?.room_number_digits!=null)setDigits(Number(settings.room_number_digits))
    if(settings?.room_number_format)setFormat(settings.room_number_format)
    setStatus('พร้อมแก้ไข')
  })()},[supabase])

  const save=async(e:FormEvent)=>{
    e.preventDefault(); if(!tenantId)return
    setSaving(true); setStatus('กำลังสร้างห้อง...')
    const {data,error}=await supabase.rpc('owner_apply_room_setup',{
      p_count:count,
      p_prefix:prefix,
      p_start:start,
      p_digits:digits,
      p_format:format
    })
    if(error){
      const msg=error.message.includes('ROOM_LIMIT_EXCEEDED')?'จำนวนห้องเกินสิทธิ์ที่เปิดใช้งาน':error.message
      setSaving(false);setStatus(`บันทึกไม่สำเร็จ: ${msg}`);return
    }
    setStatus(`บันทึกแล้ว · สร้างห้องใหม่ ${Number(data||0)} ห้อง`)
    setSaving(false)
    window.setTimeout(()=>window.location.reload(),500)
  }

  return <form onSubmit={save} className="card section">
    <div className="toolbar"><div><h2>จำนวนห้อง + รูปแบบเลขห้อง</h2><p className="muted">ตั้งครั้งแรกตรงนี้ ระบบจะสร้างรายการห้องตามรูปแบบให้เลือกด้านล่างทันที</p></div><span className="pill">{status}</span></div>
    <div className="formGrid">
      <label>จำนวนห้อง<input type="number" min="0" value={count} onChange={e=>setCount(Math.max(0,Number(e.target.value)))}/></label>
      <label>คำนำหน้า (ถ้ามี)<input value={prefix} onChange={e=>setPrefix(e.target.value)} placeholder="เช่น A หรือเว้นว่าง"/></label>
      <label>เลขเริ่มต้น<input type="number" value={start} onChange={e=>setStart(Number(e.target.value))} placeholder="เช่น 201 หรือ 3301"/></label>
      <label>จำนวนหลักเลข (ถ้าต้องเติม 0)<input type="number" min="0" value={digits} onChange={e=>setDigits(Math.max(0,Number(e.target.value)))}/></label>
      <label className="span2">รูปแบบ<input value={format} onChange={e=>setFormat(e.target.value)} placeholder="{prefix}{number}"/><small className="muted">เช่น {'{prefix}{number}'} = A201 หรือใช้ {'{number}'} อย่างเดียว = 3301</small></label>
    </div>
    <div className="section card"><strong>ตัวอย่างเลขห้อง</strong><div className="flow section">{preview.map(v=><span className="pill" key={v}>{v}</span>)}</div><p className="muted">ตัวอย่างแรก: {sampleNumber}</p></div>
    <div className="section"><button className="btn" disabled={!tenantId||saving}>{saving?'กำลังสร้างห้อง...':'บันทึกและสร้างห้อง'}</button></div>
  </form>
}
