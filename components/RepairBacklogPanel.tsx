'use client'
import { useEffect,useMemo,useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

type Ticket={id:string;room_id:string;category:string;description:string;status:string;appointment_at:string|null;appointment_status:string|null;closed_at:string|null;created_at:string}

const statusLabel=(t:Ticket)=>{
  if(t.closed_at||t.status==='closed') return 'ปิดงานแล้ว'
  if(t.status==='completed') return 'เสร็จแล้วแต่ยังไม่ปิด'
  if(t.appointment_status==='pending_confirmation') return 'รอยืนยันนัด'
  if(t.appointment_status==='confirmed') return 'นัดแล้ว'
  if(t.appointment_status==='change_requested') return 'ขอแก้ไขนัด'
  if(t.status==='in_progress') return 'กำลังซ่อม'
  if(t.status==='accepted') return 'รับงานแล้ว'
  return 'รอรับงาน'
}

export default function RepairBacklogPanel(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [rows,setRows]=useState<Ticket[]>([])
  const [status,setStatus]=useState('กำลังโหลด...')
  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser(); if(!user){setStatus('รอเชื่อมบัญชีเจ้าของ');return}
    const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle();
    if(!profile||!['owner','admin','staff'].includes(profile.role)){setStatus('ไม่มีสิทธิ์ดูงาน');return}
    const {data,error}=await supabase.from('maintenance_tickets').select('id,room_id,category,description,status,appointment_at,appointment_status,closed_at,created_at').eq('tenant_id',profile.tenant_id).is('closed_at',null).neq('status','closed').order('created_at',{ascending:false}).limit(50)
    if(error){setStatus('โหลดงานซ่อมไม่สำเร็จ');return}
    setRows((data||[]) as Ticket[]);setStatus(`งานค้าง ${data?.length||0} งาน`)
  })()},[supabase])
  return <section className="card section"><div className="toolbar"><div><h2>🔧 งานซ่อมค้าง</h2><p className="muted">การ์ดนัดหมายที่ผู้เช่ายืนยันหรือขอแก้ไขจะสะท้อนสถานะอยู่ที่งานเดิม งานจะค้างจนกว่าเจ้าของกดปิดงาน</p></div><span className="pill warn">{status}</span></div>{rows.length===0?<p className="muted section">ยังไม่มีงานซ่อมค้าง</p>:<div className="section">{rows.map(t=><div className="row" key={t.id}><div><strong>{t.category}</strong><div className="muted">{t.description||'—'}</div><small className="muted">{t.appointment_at?`นัด ${new Date(t.appointment_at).toLocaleString('th-TH')}`:'ยังไม่ได้นัด'}</small></div><span className="pill">{statusLabel(t)}</span></div>)}</div>}</section>
}
