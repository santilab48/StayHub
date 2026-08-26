'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

type Holder={id:string;display_name:string;room_id:string|null;profile_id:string|null;holder_type:string;status:string}
type Zone={id:string;name:string;zone_type:string}

export default function NfcIssueForm(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [holders,setHolders]=useState<Holder[]>([])
  const [zones,setZones]=useState<Zone[]>([])
  const [holderId,setHolderId]=useState('')
  const [zoneIds,setZoneIds]=useState<string[]>([])
  const [credentialType,setCredentialType]=useState('mobile_nfc')
  const [devicePlatform,setDevicePlatform]=useState('unknown')
  const [validUntil,setValidUntil]=useState('')
  const [status,setStatus]=useState('กำลังตรวจสิทธิ์...')
  const [saving,setSaving]=useState(false)

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('รอเชื่อมบัญชีเจ้าของ');return}
    const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
    if(!profile||!['owner','admin','staff'].includes(profile.role)){setStatus('ไม่มีสิทธิ์ออก NFC');return}
    const [{data:h},{data:z}]=await Promise.all([
      supabase.from('access_holders').select('id,display_name,room_id,profile_id,holder_type,status').eq('tenant_id',profile.tenant_id).eq('status','active').order('display_name'),
      supabase.from('access_zones').select('id,name,zone_type').eq('tenant_id',profile.tenant_id).eq('active',true).order('name')
    ])
    setHolders(h||[]);setZones(z||[]);if(h?.length)setHolderId(h[0].id)
    setStatus('พร้อมสร้างสิทธิ์')
  })()},[supabase])

  const toggle=(id:string)=>setZoneIds(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])
  const submit=async(e:FormEvent)=>{
    e.preventDefault();if(!holderId||!zoneIds.length)return
    setSaving(true);setStatus('กำลังสร้าง NFC...')
    const {data,error}=await supabase.rpc('owner_issue_access_credential',{
      p_holder_id:holderId,
      p_credential_type:credentialType,
      p_zone_ids:zoneIds,
      p_valid_until:validUntil?new Date(validUntil).toISOString():null,
      p_device_platform:devicePlatform==='unknown'?null:devicePlatform
    })
    setSaving(false)
    if(error){setStatus(`สร้างไม่สำเร็จ: ${error.message}`);return}
    setStatus(`สร้างแล้ว · Credential ${String(data).slice(0,8)} · ผู้เช่าจะเห็นใน “ห้องของฉัน”`)
  }

  return <form onSubmit={submit} className="card section">
    <div className="toolbar"><div><h2>เจน NFC ให้ผู้เช่า</h2><p className="muted">เลือกผู้ถือสิทธิ์และพื้นที่ เมื่อสร้างแล้ว credential จะผูกกับเจ้าของสิทธิ์และไปแสดงใน “ห้องของฉัน” ของผู้เช่าคนนั้น</p></div><span className="pill">{status}</span></div>
    <div className="formGrid section">
      <label>ผู้ถือสิทธิ์<select value={holderId} onChange={e=>setHolderId(e.target.value)}><option value="">เลือกผู้ถือสิทธิ์</option>{holders.map(h=><option key={h.id} value={h.id}>{h.display_name} · {h.holder_type}</option>)}</select></label>
      <label>Credential<select value={credentialType} onChange={e=>setCredentialType(e.target.value)}><option value="mobile_nfc">Mobile NFC</option><option value="wallet_nfc">Wallet NFC</option><option value="physical_card">Physical Card</option><option value="qr_fallback">QR สำรอง</option></select></label>
      <label>มือถือ<select value={devicePlatform} onChange={e=>setDevicePlatform(e.target.value)}><option value="unknown">ไม่ระบุ</option><option value="ios">iPhone</option><option value="android">Android</option><option value="physical">บัตรจริง</option></select></label>
      <label>หมดอายุ<input type="datetime-local" value={validUntil} onChange={e=>setValidUntil(e.target.value)}/></label>
      <label className="span2">พื้นที่ที่อนุญาต<div className="checkGrid">{zones.map(z=><label key={z.id}><input type="checkbox" checked={zoneIds.includes(z.id)} onChange={()=>toggle(z.id)}/> {z.name}</label>)}</div></label>
    </div>
    <div className="toolbar section"><p className="muted">เจ้าของเป็นผู้สร้าง/เพิกถอน ผู้เช่าดูอย่างเดียว และหน้าเว็บไม่แสดง private NFC secret</p><button className="btn" disabled={saving||!holderId||!zoneIds.length}>{saving?'กำลังสร้าง...':'สร้างและส่งเข้าห้องของฉัน'}</button></div>
  </form>
}
