'use client'

import {FormEvent,useEffect,useMemo,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {createSupabaseBrowser} from '../lib/supabase-browser'
import {tenantRoutes} from '../lib/routes'

type Room={id:string;room_no:string;floor:string|null;status:string|null;building_id:string|null}
type Portal={delivery_address:string|null;postal_code:string|null;office_phone:string|null;security_phone:string|null;emergency_phone:string|null;wifi_ssid:string|null;wifi_password:string|null;wifi_note:string|null;move_in_date:string|null;keys_issued:number;handover_condition:string|null;move_out_notice_date:string|null;inspection_date:string|null;move_out_status:string;owner_note:string|null}
type RoomSummary={building:string;resident:string;lease:string}

const blank:Portal={delivery_address:'',postal_code:'',office_phone:'',security_phone:'',emergency_phone:'',wifi_ssid:'',wifi_password:'',wifi_note:'',move_in_date:'',keys_issued:0,handover_condition:'',move_out_notice_date:'',inspection_date:'',move_out_status:'none',owner_note:''}

export default function RoomOwnerSourceForm({slug}:{slug:string}){
 const supabase=useMemo(()=>createSupabaseBrowser(),[]),r=tenantRoutes(slug),search=useSearchParams()
 const contextRoomId=search.get('room_id')||''
 const [rooms,setRooms]=useState<Room[]>([]),[roomId,setRoomId]=useState(contextRoomId),[tenantId,setTenantId]=useState('')
 const [data,setData]=useState<Portal>(blank),[summary,setSummary]=useState<RoomSummary>({building:'—',resident:'—',lease:'—'})
 const [status,setStatus]=useState('กำลังตรวจสิทธิ์...'),[saving,setSaving]=useState(false)

 useEffect(()=>{if(contextRoomId)setRoomId(contextRoomId)},[contextRoomId])

 useEffect(()=>{(async()=>{
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){setStatus('กรุณาเข้าสู่ระบบหลังบ้าน');return}
  const {data:profile,error:pErr}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).single()
  if(pErr||!profile){setStatus('ไม่พบโปรไฟล์ผู้ดูแล');return}
  if(!['owner','admin','staff'].includes(profile.role)){setStatus('บัญชีนี้ไม่มีสิทธิ์แก้ข้อมูลห้อง');return}
  setTenantId(profile.tenant_id)
  const {data:rows,error:rErr}=await supabase.from('rooms').select('id,room_no,floor,status,building_id').eq('tenant_id',profile.tenant_id).order('room_no')
  if(rErr){setStatus('โหลดรายการห้องไม่สำเร็จ');return}
  setRooms(rows||[])
  if(contextRoomId&&rows?.some(x=>x.id===contextRoomId))setRoomId(contextRoomId)
  else if(!roomId&&rows?.length)setRoomId(rows[0].id)
  setStatus('พร้อมแก้ไขข้อมูล')
 })()},[supabase,contextRoomId,roomId])

 useEffect(()=>{if(!roomId||!tenantId)return;(async()=>{
  setStatus('กำลังโหลดข้อมูลห้อง...')
  const room=rooms.find(x=>x.id===roomId)
  const [{data:portal},{data:lease},{data:building}]=await Promise.all([
   supabase.from('room_portal_settings').select('delivery_address,postal_code,office_phone,security_phone,emergency_phone,wifi_ssid,wifi_password,wifi_note,move_in_date,keys_issued,handover_condition,move_out_notice_date,inspection_date,move_out_status,owner_note').eq('tenant_id',tenantId).eq('room_id',roomId).maybeSingle(),
   supabase.from('leases').select('profile_id,start_date,end_date,status').eq('tenant_id',tenantId).eq('room_id',roomId).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle(),
   room?.building_id?supabase.from('buildings').select('name').eq('id',room.building_id).maybeSingle():Promise.resolve({data:null} as any)
  ])
  let resident='—'
  if(lease?.profile_id){const {data:p}=await supabase.from('profiles').select('full_name').eq('id',lease.profile_id).maybeSingle();resident=p?.full_name||'—'}
  setData(portal?{...blank,...portal}:blank)
  setSummary({building:building?.name||'—',resident,lease:lease?`${lease.start_date} → ${lease.end_date||'ไม่กำหนด'}`:'ยังไม่มีสัญญา active'})
  setStatus('พร้อมแก้ไขข้อมูล')
 })()},[roomId,tenantId,rooms,supabase])

 const set=(key:keyof Portal,value:string|number)=>setData(v=>({...v,[key]:value}))
 const save=async(e:FormEvent)=>{e.preventDefault();if(!roomId||!tenantId)return;setSaving(true);setStatus('กำลังบันทึก...')
  const payload={...data,tenant_id:tenantId,room_id:roomId,updated_at:new Date().toISOString()}
  const {error}=await supabase.from('room_portal_settings').upsert(payload,{onConflict:'tenant_id,room_id'})
  setSaving(false);setStatus(error?`บันทึกไม่สำเร็จ: ${error.message}`:'บันทึกแล้ว — ข้อมูลพร้อมแสดงใน ห้องของฉัน')
 }
 const selected=rooms.find(x=>x.id===roomId)
 const withRoom=(href:string)=>roomId?`${href}?room_id=${encodeURIComponent(roomId)}`:href
 const SaveButton=({label}:{label:string})=><div className="toolbar section" style={{justifyContent:'flex-end',marginBottom:0}}><button type="submit" className="btn" disabled={saving||!tenantId||!roomId}>{saving?'กำลังบันทึก...':label}</button></div>

 return <form onSubmit={save} className="section">
  <section className="card">
   <div className="toolbar"><div><h2>ห้องที่กำลังจัดการ</h2><p className="muted">รับ room_id ตรงจากแท็บทั่วไปและบันทึกทุกช่องลงห้องนี้</p></div><span className="pill">{status}</span></div>
   <div className="formGrid"><label className="span2">ห้อง<select value={roomId} onChange={e=>setRoomId(e.target.value)} disabled={Boolean(contextRoomId)||!rooms.length}><option value="">เลือกห้อง</option>{rooms.map(x=><option key={x.id} value={x.id}>{x.room_no}{x.floor?` · ชั้น ${x.floor}`:''}</option>)}</select></label></div>
   {selected&&<div className="metricGrid"><div className="metric"><span className="muted">ห้อง</span><strong>{selected.room_no}</strong><small>{summary.building}{selected.floor?` · ชั้น ${selected.floor}`:''}</small></div><div className="metric"><span className="muted">ผู้เช่าหลัก</span><strong style={{fontSize:18}}>{summary.resident}</strong><small>จากสัญญา active</small></div><div className="metric"><span className="muted">สัญญา</span><strong style={{fontSize:15}}>{summary.lease}</strong><small>ข้อมูลอ่านอย่างเดียว</small></div><div className="metric"><span className="muted">สถานะห้อง</span><strong style={{fontSize:18}}>{selected.status||'—'}</strong><small>จากข้อมูลห้อง</small></div></div>}
  </section>

  <section className="card section"><div className="toolbar"><div><h2>📶 Wi‑Fi</h2><p className="muted">แสดงในหน้า ห้องของฉัน และผู้พักกดคัดลอกรหัสได้</p></div><span className="pill">แสดงให้ผู้พัก</span></div><div className="formGrid"><label>ชื่อ Wi‑Fi<input value={data.wifi_ssid||''} onChange={e=>set('wifi_ssid',e.target.value)} placeholder="เช่น StayHub_A201"/></label><label>รหัสผ่าน<input value={data.wifi_password||''} onChange={e=>set('wifi_password',e.target.value)}/></label><label className="span2">หมายเหตุ<textarea value={data.wifi_note||''} onChange={e=>set('wifi_note',e.target.value)} placeholder="เช่น ใช้ได้เฉพาะภายในห้อง"/></label></div><SaveButton label="บันทึก Wi‑Fi"/></section>

  <section className="card section"><div className="toolbar"><div><h2>📦 ที่อยู่รับพัสดุ</h2><p className="muted">ผู้พักเห็นชื่อ/ห้องจากระบบ และกดคัดลอกที่อยู่ชุดนี้ได้</p></div><span className="pill">แสดงให้ผู้พัก</span></div><div className="formGrid"><label className="span2">ที่อยู่หอพัก<textarea value={data.delivery_address||''} onChange={e=>set('delivery_address',e.target.value)} placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด"/></label><label>รหัสไปรษณีย์<input value={data.postal_code||''} onChange={e=>set('postal_code',e.target.value)}/></label></div><SaveButton label="บันทึกที่อยู่พัสดุ"/></section>

  <section className="card section"><div className="toolbar"><div><h2>☎️ เบอร์โทร</h2><p className="muted">หน้า member ไม่โชว์ตัวเลข ผู้พักกดชื่อแล้วโทรออกทันที</p></div><span className="pill">กดชื่อเพื่อโทร</span></div><div className="formGrid"><label>สำนักงาน / เจ้าของ<input inputMode="tel" value={data.office_phone||''} onChange={e=>set('office_phone',e.target.value)} placeholder="เบอร์โทร"/></label><label>รปภ.<input inputMode="tel" value={data.security_phone||''} onChange={e=>set('security_phone',e.target.value)} placeholder="เบอร์โทร"/></label><label>ฉุกเฉิน<input inputMode="tel" value={data.emergency_phone||''} onChange={e=>set('emergency_phone',e.target.value)} placeholder="เช่น 1669 หรือเบอร์ฉุกเฉินของหอ"/></label></div><SaveButton label="บันทึกเบอร์โทร"/></section>

  <section className="card section"><div className="toolbar"><div><h2>🗝️ รับมอบห้องและทรัพย์สิน</h2><p className="muted">ข้อมูลชุดนี้ไปรวมเป็นกล่องเดียวในหน้า ห้องของฉัน</p></div><span className="pill">แสดงให้ผู้พัก</span></div><div className="formGrid"><label>วันที่เข้าอยู่<input type="date" value={data.move_in_date||''} onChange={e=>set('move_in_date',e.target.value)}/></label><label>จำนวนกุญแจ<input type="number" min="0" value={data.keys_issued} onChange={e=>set('keys_issued',Number(e.target.value))}/></label><label className="span2">สภาพตอนรับมอบ<textarea value={data.handover_condition||''} onChange={e=>set('handover_condition',e.target.value)} placeholder="เช่น ห้องปกติ ผนัง/พื้น/เฟอร์นิเจอร์ตรวจแล้ว"/></label></div><SaveButton label="บันทึกรับมอบห้อง"/><div className="toolbar section" style={{marginBottom:0}}><div><strong>ทรัพย์สินในห้อง</strong><p className="muted">แอร์ เตียง ตู้ โต๊ะ ทีวี และสภาพของแต่ละรายการ</p></div><a className="btn secondary" href={withRoom(r.adminRoomDocuments)}>จัดการรายการ/เอกสารทรัพย์สิน</a></div></section>

  <section className="card section"><div className="toolbar"><div><h2>🚪 การย้ายออก</h2><p className="muted">จะแสดงเฉพาะเมื่อมีข้อมูลย้ายออก</p></div><span className="pill">แสดงเมื่อมีข้อมูล</span></div><div className="formGrid"><label>วันที่แจ้งย้ายออก<input type="date" value={data.move_out_notice_date||''} onChange={e=>set('move_out_notice_date',e.target.value)}/></label><label>วันนัดตรวจห้อง<input type="date" value={data.inspection_date||''} onChange={e=>set('inspection_date',e.target.value)}/></label><label>สถานะ<select value={data.move_out_status} onChange={e=>set('move_out_status',e.target.value)}><option value="none">ยังไม่แจ้ง</option><option value="notice_given">แจ้งแล้ว</option><option value="inspection_scheduled">นัดตรวจห้องแล้ว</option><option value="moving_out">กำลังย้ายออก</option><option value="completed">สิ้นสุดการเข้าพัก</option></select></label><label>หมายเหตุเจ้าของ<input value={data.owner_note||''} onChange={e=>set('owner_note',e.target.value)}/></label></div><SaveButton label="บันทึกข้อมูลย้ายออก"/></section>

  <section className="card section"><div className="toolbar"><div><h2>ข้อมูลที่หน้า ห้องของฉัน ดึงจากระบบอื่น</h2><p className="muted">ทุกปุ่มส่ง room_id ห้องปัจจุบันต่อไป ไม่เลือกห้องใหม่ระหว่างทาง</p></div></div><div className="grid roomMenu"><a className="card tile" href={withRoom(r.adminAccessIssue)}><span className="icon">📱</span><h3>NFC เข้า-ออกหอ</h3><p className="muted">ออกสิทธิ์ให้ห้องนี้</p></a><a className="card tile" href={withRoom(r.adminContracts)}><span className="icon">📄</span><h3>สัญญา PDF</h3><p className="muted">สัญญา Paperless และ PDF Final</p></a><a className="card tile" href={withRoom(r.adminRoomDocuments)}><span className="icon">📘</span><h3>กฎระเบียบหอ</h3><p className="muted">ไฟล์/เอกสารของห้องนี้</p></a><a className="card tile" href={withRoom(r.adminRoomOccupancy)}><span className="icon">👥</span><h3>ผู้พัก</h3><p className="muted">ผู้พักของห้องนี้</p></a><a className="card tile" href={withRoom(r.adminRoomVehicles)}><span className="icon">🚗</span><h3>รถของห้อง</h3><p className="muted">ทะเบียนของห้องนี้</p></a></div></section>

  <div className="section" style={{display:'flex',justifyContent:'flex-end'}}><button type="submit" className="btn" disabled={saving||!tenantId||!roomId}>{saving?'กำลังบันทึก...':'บันทึกทั้งหมดอีกครั้ง'}</button></div>
 </form>
}
