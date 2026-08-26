'use client'
import { useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

export default function GeneralAnnouncementComposer(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [title,setTitle]=useState('')
  const [body,setBody]=useState('')
  const [audience,setAudience]=useState('all')
  const [publishedAt,setPublishedAt]=useState('')
  const [expiresAt,setExpiresAt]=useState('')
  const [pinned,setPinned]=useState(false)
  const [sendLine,setSendLine]=useState(true)
  const [status,setStatus]=useState('')

  const save=async()=>{
    setStatus('กำลังบันทึก...')
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('กรุณาเชื่อมบัญชีเจ้าของก่อน');return}
    const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
    if(!profile||!['owner','admin','staff'].includes(profile.role)){setStatus('ไม่มีสิทธิ์สร้างประกาศ');return}
    const payload:any={tenant_id:profile.tenant_id,title,body,audience,published_at:publishedAt?new Date(publishedAt).toISOString():new Date().toISOString(),expires_at:expiresAt?new Date(expiresAt).toISOString():null,is_pinned:pinned,line_delivery_requested:sendLine}
    const {error}=await supabase.from('announcements').insert(payload)
    if(error){setStatus(`บันทึกไม่สำเร็จ: ${error.message}`);return}
    setTitle('');setBody('');setAudience('all');setPublishedAt('');setExpiresAt('');setPinned(false);setSendLine(true);setStatus(sendLine?'บันทึกแล้ว · รอส่ง LINE เมื่อเชื่อม Messaging API':'บันทึกประกาศแล้ว')
  }

  return <section className="section card">
    <div className="toolbar"><div><h2>📢 สร้างประกาศ</h2><p className="muted">สร้างจากแท็บทั่วไปได้ทันที เลือกผู้รับและกำหนดวันแสดงได้</p></div>{status&&<span className="pill">{status}</span>}</div>
    <div className="formGrid">
      <label>หัวข้อ<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="เช่น แจ้งปิดน้ำชั่วคราว"/></label>
      <label>ส่งถึง<select value={audience} onChange={e=>setAudience(e.target.value)}><option value="all">ทั้งหอ</option><option value="building">เฉพาะอาคาร</option><option value="floor">เฉพาะชั้น</option><option value="room">เฉพาะห้อง</option></select></label>
      <label className="span2">รายละเอียด<textarea rows={3} value={body} onChange={e=>setBody(e.target.value)} placeholder="รายละเอียดประกาศ"/></label>
      <label>เผยแพร่เมื่อ<input type="datetime-local" value={publishedAt} onChange={e=>setPublishedAt(e.target.value)}/></label>
      <label>หมดอายุเมื่อ<input type="datetime-local" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)}/></label>
      <label><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)}/> ปักหมุด</label>
      <label><input type="checkbox" checked={sendLine} onChange={e=>setSendLine(e.target.checked)}/> ส่ง LINE Card ด้วย</label>
      <label className="span2">แนบรูป / ไฟล์<input type="file" multiple/></label>
    </div>
    <div className="section"><button className="btn" onClick={save} disabled={!title.trim()||!body.trim()}>บันทึกประกาศ</button></div>
  </section>
}
