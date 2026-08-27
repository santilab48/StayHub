'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

type Room={id:string;room_no:string;floor:string|null;status:string|null;is_enabled:boolean}
type Lease={room_id:string;profile_id:string;profiles:{full_name:string|null}|null}
type Zone={id:string;name:string;zone_type:string}

export default function NfcIssueForm(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [rooms,setRooms]=useState<Room[]>([])
  const [residentByRoom,setResidentByRoom]=useState<Record<string,string>>({})
  const [zones,setZones]=useState<Zone[]>([])
  const [roomId,setRoomId]=useState('')
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

    const [{data:r},{data:l},{data:z}]=await Promise.all([
      supabase.from('rooms').select('id,room_no,floor,status,is_enabled').eq('tenant_id',profile.tenant_id).eq('is_enabled',true).order('room_no'),
      supabase.from('leases').select('room_id,profile_id,profiles(full_name)').eq('tenant_id',profile.tenant_id).eq('status','active').order('created_at',{ascending:false}),
      supabase.from('access_zones').select('id,name,zone_type').eq('tenant_id',profile.tenant_id).eq('active',true).order('name')
    ])

    const map:Record<string,string>={}
    for(const row of (l||[]) as unknown as Lease[]) if(!map[row.room_id]) map[row.room_id]=row.profiles?.full_name||'ผู้เช่าหลัก'
    setResidentByRoom(map)
    const eligible=(r||[]).filter(x=>Boolean(map[x.id]))
    setRooms(eligible)
    setZones(z||[])
    if(eligible.length)setRoomId(eligible[0].id)
    setStatus(eligible.length?'พร้อมสร้าง NFC':'ยังไม่มีห้องที่มีผู้เช่า active')
  })()},[supabase])

  const toggle=(id:string)=>setZoneIds(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])
  const submit=async(e:FormEvent)=>{
    e.preventDefault();if(!roomId||!zoneIds.length)return
    setSaving(true);setStatus('กำลังสร้างและส่ง NFC...')
    const {data,error}=await supabase.rpc('owner_issue_room_access_credential',{
      p_room_id:roomId,
      p_credential_type:credentialType,
      p_zone_ids:zoneIds,
      p_valid_until:validUntil?new Date(validUntil).toISOString():null,
      p_device_platform:devicePlatform==='unknown'?null:devicePlatform
    })
    setSaving(false)
    if(error){setStatus(`สร้างไม่สำเร็จ: ${error.message}`);return}
    const room=rooms.find(x=>x.id===roomId)
    setStatus(`ส่งแล้ว · ห้อง ${room?.room_no||''} · ผู้เช่าจะเห็นใน “ห้องของฉัน” · ${String(data).slice(0,8)}`)
  }

  const selected=rooms.find(x=>x.id===roomId)
  return <form onSubmit={submit} className="card section">
    <div className="toolbar"><div><h2>สร้าง NFC ให้ห้อง</h2><p className="muted">เลือกห้อง ระบบจะหาผู้เช่าหลักจากสัญญา active และส่ง NFC ไปหน้า “ห้องของฉัน” ของผู้เช่าคนนั้นอัตโนมัติ</p></div><span className="pill">{status}</span></div>

    <div className="formGrid section">
      <label>ห้อง<select value={roomId} onChange={e=>setRoomId(e.target.value)}><option value="">เลือกห้อง</option>{rooms.map(r=><option key={r.id} value={r.id}>ห้อง {r.room_no}{r.floor?` · ชั้น ${r.floor}`:''}</option>)}</select></label>
      <label>ผู้เช่าหลัก<input readOnly value={roomId?(residentByRoom[roomId]||'ไม่พบผู้เช่า active'):''}/></label>
      <label>รูปแบบ NFC<select value={credentialType} onChange={e=>setCredentialType(e.target.value)}><option value="mobile_nfc">NFC บนมือถือ</option><option value="wallet_nfc">NFC ใน Wallet</option><option value="physical_card">บัตร NFC</option><option value="qr_fallback">QR สำรอง</option></select></label>
      <label>อุปกรณ์<select value={devicePlatform} onChange={e=>setDevicePlatform(e.target.value)}><option value="unknown">ไม่ระบุ</option><option value="ios">iPhone</option><option value="android">Android</option><option value="physical">บัตรจริง</option></select></label>
      <label>หมดอายุ<input type="datetime-local" value={validUntil} onChange={e=>setValidUntil(e.target.value)}/></label>
      <label className="span2">พื้นที่ที่เข้าได้<div className="checkGrid">{zones.map(z=><label key={z.id}><input type="checkbox" checked={zoneIds.includes(z.id)} onChange={()=>toggle(z.id)}/> {z.name}</label>)}</div></label>
    </div>

    {selected&&<section className="noticeBox card"><strong>กำลังส่งให้ห้อง {selected.room_no}</strong><p className="muted">ผู้รับ: {residentByRoom[selected.id]} · เมื่อกดสร้าง ระบบจะสร้างสิทธิ์และแสดงใน NFC ของฉัน โดยผู้เช่าดูอย่างเดียว</p></section>}

    <div className="toolbar section"><p className="muted">ผู้เช่าไม่ต้องเลือกห้องหรือกรอกข้อมูล NFC เอง เจ้าของเป็นผู้สร้าง/เพิกถอนทั้งหมด</p><button className="btn" disabled={saving||!roomId||!zoneIds.length}>{saving?'กำลังสร้าง...':'สร้างและส่งให้ห้อง'}</button></div>
  </form>
}
