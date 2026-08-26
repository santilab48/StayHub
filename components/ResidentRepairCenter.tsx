'use client'
import {FormEvent,useEffect,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type Ticket={id:string;category:string;description:string|null;status:string;appointment_at:string|null;appointment_status:string;appointment_note:string|null;closed_at:string|null;created_at:string}
const labels:Record<string,string>={submitted:'ส่งเรื่อง',accepted:'รับงานแล้ว',scheduled:'นัดหมาย',in_progress:'กำลังซ่อม',completed:'เสร็จแล้ว รอเจ้าของปิด',cancelled:'ยกเลิก'}
export default function ResidentRepairCenter(){
 const supabase=useMemo(()=>createSupabaseBrowser(),[])
 const [tenantId,setTenantId]=useState(''),[profileId,setProfileId]=useState(''),[roomId,setRoomId]=useState('')
 const [category,setCategory]=useState('ไฟฟ้า'),[detail,setDetail]=useState(''),[files,setFiles]=useState<File[]>([]),[tickets,setTickets]=useState<Ticket[]>([])
 const [status,setStatus]=useState('กำลังโหลด...'),[saving,setSaving]=useState(false),[changeAt,setChangeAt]=useState<Record<string,string>>({})
 const load=async()=>{
  const {data:{user}}=await supabase.auth.getUser(); if(!user){setStatus('กรุณาเข้าสู่ระบบ');return}
  const {data:p}=await supabase.from('profiles').select('id,tenant_id').eq('auth_user_id',user.id).maybeSingle(); if(!p){setStatus('ไม่พบข้อมูลผู้เช่า');return}
  setTenantId(p.tenant_id);setProfileId(p.id)
  const {data:l}=await supabase.from('leases').select('room_id').eq('profile_id',p.id).in('status',['active','tenant_signed']).order('created_at',{ascending:false}).limit(1).maybeSingle(); if(!l){setStatus('ยังไม่มีห้องที่ผูกกับบัญชีนี้');return}
  setRoomId(l.room_id)
  const {data:t}=await supabase.from('maintenance_tickets').select('id,category,description,status,appointment_at,appointment_status,appointment_note,closed_at,created_at').eq('profile_id',p.id).order('created_at',{ascending:false}).limit(20)
  setTickets((t||[]) as Ticket[]);setStatus('พร้อมแจ้งซ่อม')
 }
 useEffect(()=>{load()},[])
 const submit=async(e:FormEvent)=>{e.preventDefault();if(!tenantId||!profileId||!roomId||!detail.trim())return;setSaving(true);setStatus('กำลังส่ง...')
   const id=crypto.randomUUID(); const {error}=await supabase.from('maintenance_tickets').insert({id,tenant_id:tenantId,room_id:roomId,profile_id:profileId,category,description:detail.trim(),status:'submitted',appointment_status:'none'})
   if(error){setSaving(false);setStatus(error.message);return}
   for(const file of files){const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${tenantId}/${id}/${Date.now()}-${safe}`;const {error:up}=await supabase.storage.from('stayhub-maintenance').upload(path,file,{upsert:false});if(!up)await supabase.from('ticket_images').insert({tenant_id:tenantId,ticket_id:id,image_path:path})}
   setDetail('');setFiles([]);setSaving(false);setStatus('ส่งแจ้งซ่อมแล้ว');await load()
 }
 const respond=async(id:string,action:'confirm'|'change')=>{const newAt=action==='change'?changeAt[id]:undefined;if(action==='change'&&!newAt)return;setStatus('กำลังบันทึกนัด...');const {error}=await supabase.rpc('respond_maintenance_appointment',{p_ticket_id:id,p_action:action,p_new_at:newAt?new Date(newAt).toISOString():null,p_note:null});setStatus(error?error.message:(action==='confirm'?'ยืนยันนัดแล้ว':'ส่งเวลาที่ขอแก้ไขแล้ว'));await load()}
 return <>
  <form className="section card" onSubmit={submit}><div className="toolbar"><div><h3>แจ้งซ่อม</h3><p className="muted">หัวข้อ + รายละเอียด + รูป เท่านั้น</p></div><span className="pill">{status}</span></div><div className="formGrid"><label>หัวข้อที่เสีย<select value={category} onChange={e=>setCategory(e.target.value)}><option>ไฟฟ้า</option><option>ประปา</option><option>แอร์</option><option>อินเทอร์เน็ต</option><option>ประตู / กุญแจ</option><option>เฟอร์นิเจอร์</option><option>ห้องน้ำ</option><option>อื่น ๆ</option></select></label><label className="span2">รายละเอียด<textarea rows={3} value={detail} onChange={e=>setDetail(e.target.value)} required placeholder="เช่น แอร์ไม่เย็นและมีน้ำหยด"/></label><label className="span2">แนบภาพ<input type="file" accept="image/*" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label></div><div className="section"><button className="btn" disabled={saving||!roomId}>{saving?'กำลังส่ง...':'ส่งแจ้งซ่อม'}</button></div></form>
  <section className="section card"><h3>งานของฉัน</h3>{tickets.length===0?<p className="muted">ยังไม่มีงานซ่อม</p>:tickets.map(t=><div className="card section" key={t.id}><div className="toolbar"><div><strong>{t.category}</strong><div className="muted">{t.description||'—'}</div></div><span className="pill">{t.closed_at?'ปิดงานแล้ว':labels[t.status]||t.status}</span></div>{t.appointment_at&&<><div className="infoRow"><span className="muted">เวลานัด</span><strong>{new Date(t.appointment_at).toLocaleString('th-TH')}</strong></div><div className="infoRow"><span className="muted">สถานะนัด</span><strong>{t.appointment_status}</strong></div>{t.appointment_note&&<p className="muted">{t.appointment_note}</p>}{t.appointment_status==='pending_confirmation'&&<div className="flow section"><button type="button" className="btn" onClick={()=>respond(t.id,'confirm')}>ยืนยันนัด</button><input type="datetime-local" value={changeAt[t.id]||''} onChange={e=>setChangeAt({...changeAt,[t.id]:e.target.value})}/><button type="button" className="btn secondary" onClick={()=>respond(t.id,'change')}>ขอแก้เวลา</button></div>}</>}</div>)}</section>
 </>
}
