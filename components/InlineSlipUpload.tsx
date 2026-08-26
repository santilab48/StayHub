'use client'

import { ChangeEvent, FormEvent, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

export default function InlineSlipUpload({tenantId,invoiceId,amount}:{tenantId:string;invoiceId:string;amount:number}){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [file,setFile]=useState<File|null>(null)
  const [note,setNote]=useState('')
  const [status,setStatus]=useState('')
  const [saving,setSaving]=useState(false)

  const onFile=(e:ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]||null)
  const submit=async(e:FormEvent)=>{
    e.preventDefault()
    if(!file){setStatus('กรุณาแนบสลิปก่อน');return}
    setSaving(true);setStatus('กำลังส่งสลิป...')
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setSaving(false);setStatus('ยังไม่ได้เข้าสู่ระบบ');return}
    const ext=file.name.split('.').pop()||'jpg'
    const path=`${tenantId}/${invoiceId}/${user.id}-${Date.now()}.${ext}`
    const {error:upErr}=await supabase.storage.from('stayhub-payments').upload(path,file,{upsert:false})
    if(upErr){setSaving(false);setStatus(`อัปโหลดไม่สำเร็จ: ${upErr.message}`);return}
    const {error}=await supabase.from('payments').insert({tenant_id:tenantId,invoice_id:invoiceId,amount,slip_path:path,status:'pending',payer_note:note||null,submitted_at:new Date().toISOString()})
    setSaving(false)
    setStatus(error?`ส่งไม่สำเร็จ: ${error.message}`:'ส่งสลิปแล้ว · รอเจ้าของตรวจ')
    if(!error)setFile(null)
  }

  return <form onSubmit={submit} className="section card">
    <div className="toolbar"><div><h3>แนบสลิปชำระเงิน</h3><p className="muted">ส่งจากหน้าบิลนี้ได้เลย เมื่อส่งแล้วสถานะจะเป็น “รอเจ้าของตรวจ”</p></div><span className="pill">ยอด {amount.toLocaleString('th-TH')} บาท</span></div>
    <div className="formGrid">
      <label>รูปสลิป<input type="file" accept="image/*" onChange={onFile}/></label>
      <label>หมายเหตุ<input value={note} onChange={e=>setNote(e.target.value)} placeholder="เช่น โอนจากบัญชี..."/></label>
    </div>
    <div className="toolbar section"><button className="btn" disabled={saving}>{saving?'กำลังส่ง...':'ส่งสลิปให้เจ้าของตรวจ'}</button><span className="muted">{status}</span></div>
  </form>
}
