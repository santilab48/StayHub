'use client'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

export default function GeneralRoomCountForm(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [tenantId,setTenantId]=useState('')
  const [licensed,setLicensed]=useState(0)
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
    const [{data:settings},{data:tenant},{count:enabledCount}]=await Promise.all([
      supabase.from('tenant_settings').select('declared_room_count,room_number_format,room_number_prefix,room_number_start,room_number_digits').eq('tenant_id',profile.tenant_id).maybeSingle(),
      supabase.from('tenants').select('licensed_room_count').eq('id',profile.tenant_id).maybeSingle(),
      supabase.from('rooms').select('id',{count:'exact',head:true}).eq('tenant_id',profile.tenant_id).eq('is_enabled',true)
    ])
    const limit=Number(tenant?.licensed_room_count||0)
    setLicensed(limit)
    setCount(Math.min(Number(settings?.declared_room_count||enabledCount||0),limit||Number.MAX_SAFE_INTEGER))
    if(settings?.room_number_prefix!=null)setPrefix(settings.room_number_prefix)
    if(settings?.room_number_start!=null)setStart(Number(settings.room_number_start))
    if(settings?.room_number_digits!=null)setDigits(Number(settings.room_number_digits))
    if(settings?.room_number_format)setFormat(settings.room_number_format)
    setStatus(`สิทธิ์เปิดได้สูงสุด ${limit} ห้อง · เปิดอยู่ ${enabledCount||0} ห้อง`)
  })()},[supabase])

  const save=async(e:FormEvent)=>{
    e.preventDefault(); if(!tenantId)return
    if(count>licensed){setStatus(`เปิดได้สูงสุด ${licensed} ห้อง ตามจำนวนที่เช่า`);return}
    setSaving(true); setStatus('กำลังสร้างห้อง...')
    const {data,error}=await supabase.rpc('owner_apply_room_setup',{
      p_count:count,
      p_prefix:prefix,
      p_start:start,
      p_digits:digits,
      p_format:format
    })
    if(error){
      const msg=error.message.includes('ROOM_LIMIT_EXCEEDED')?`เปิดได้สูงสุด ${licensed} ห้อง ตามจำนวนที่เช่า`:error.message.includes('ROOM_LICENSE_LIMIT_REACHED')?`สิทธิ์ห้องเต็มแล้ว (${licensed} ห้อง)`:error.message
      setSaving(false);setStatus(`บันทึกไม่สำเร็จ: ${msg}`);return
    }
    setStatus(`บันทึกแล้ว · สร้างห้องใหม่ ${Number(data||0)} ห้อง · สูงสุด ${licensed} ห้อง`)
    setSaving(false)
    window.setTimeout(()=>window.location.reload(),500)
  }

  return <form onSubmit={save} className="card section">
    <div className="toolbar"><div><h2>จำนวนห้อง + รูปแบบเลขห้อง</h2><p className="muted">ตั้งจำนวนห้องรวมที่ต้องการใช้งาน ระบบจะสร้างเฉพาะห้องที่ยังไม่มี และห้ามเกินจำนวนห้องที่ Super Admin อนุมัติไว้</p></div><span className="pill">{status}</span></div>
    <div className="noticeBox section"><strong>สิทธิ์ห้อง: สูงสุด {licensed} ห้อง</strong><p className="muted">จำนวนนี้ถูกล็อกโดย Super Admin ตามจำนวนที่เช่า เจ้าบ้านเพิ่มเกินเองไม่ได้</p></div>
    <div className="formGrid">
      <label>จำนวนห้องรวม<input type="number" min="0" max={licensed||0} value={count} onChange={e=>setCount(Math.min(licensed,Math.max(0,Number(e.target.value))))}/><small className="muted">สูงสุด {licensed} ห้อง</small></label>
      <label>คำนำหน้า (ถ้ามี)<input value={prefix} onChange={e=>setPrefix(e.target.value)} placeholder="เช่น A หรือเว้นว่าง"/></label>
      <label>เลขเริ่มต้น<input type="number" value={start} onChange={e=>setStart(Number(e.target.value))} placeholder="เช่น 201 หรือ 3301"/></label>
      <label>จำนวนหลักเลข (ถ้าต้องเติม 0)<input type="number" min="0" value={digits} onChange={e=>setDigits(Math.max(0,Number(e.target.value)))}/></label>
      <label className="span2">รูปแบบ<input value={format} onChange={e=>setFormat(e.target.value)} placeholder="{prefix}{number}"/><small className="muted">เช่น {'{prefix}{number}'} = A201 หรือใช้ {'{number}'} อย่างเดียว = 3301</small></label>
    </div>
    <div className="section card"><strong>ตัวอย่างเลขห้อง</strong><div className="flow section">{preview.map(v=><span className="pill" key={v}>{v}</span>)}</div><p className="muted">ตัวอย่างแรก: {sampleNumber}</p></div>
    <div className="section"><button className="btn" disabled={!tenantId||saving||licensed<=0}>{saving?'กำลังสร้างห้อง...':'บันทึกและสร้างห้อง'}</button></div>
  </form>
}
