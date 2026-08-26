'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

type Template = {
  id?:string; template_name:string; bill_title:string; payment_account_name:string; payment_account_no:string; payment_bank_name:string; footer_note:string;
  show_logo:boolean; show_resident_name:boolean; show_room:boolean; show_period:boolean; show_due_date:boolean; show_rent:boolean; show_water:boolean; show_electric:boolean;
  show_other:boolean; show_late_fee:boolean; show_meter_detail:boolean; show_payment_account:boolean; show_payment_qr:boolean; show_footer_note:boolean; show_receipt_status:boolean;
}

const blank:Template={template_name:'บิลมาตรฐาน',bill_title:'ใบแจ้งค่าใช้จ่าย',payment_account_name:'',payment_account_no:'',payment_bank_name:'',footer_note:'',show_logo:true,show_resident_name:true,show_room:true,show_period:true,show_due_date:true,show_rent:true,show_water:true,show_electric:true,show_other:true,show_late_fee:true,show_meter_detail:true,show_payment_account:true,show_payment_qr:true,show_footer_note:true,show_receipt_status:true}

const checks:[keyof Template,string][]=[
  ['show_logo','โลโก้หอ'],['show_resident_name','ชื่อผู้เช่า'],['show_room','เลขห้อง'],['show_period','รอบบิล'],['show_due_date','วันครบกำหนด'],
  ['show_rent','ค่าเช่า'],['show_water','ค่าน้ำ'],['show_electric','ค่าไฟ'],['show_other','ค่าใช้จ่ายอื่น'],['show_late_fee','ค่าปรับ'],['show_meter_detail','รายละเอียดมิเตอร์'],
  ['show_payment_account','บัญชีรับชำระ'],['show_payment_qr','QR ชำระเงิน'],['show_footer_note','หมายเหตุท้ายบิล'],['show_receipt_status','สถานะชำระ/ใบเสร็จ']
]

export default function BillTemplateDesigner(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [tenantId,setTenantId]=useState('')
  const [data,setData]=useState<Template>(blank)
  const [status,setStatus]=useState('กำลังตรวจสิทธิ์...')
  const [saving,setSaving]=useState(false)

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('รอเชื่อมบัญชีเจ้าของ');return}
    const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).single()
    if(!profile||!['owner','admin','staff'].includes(profile.role)){setStatus('ไม่มีสิทธิ์ออกแบบบิล');return}
    setTenantId(profile.tenant_id)
    const {data:row}=await supabase.from('tenant_bill_templates').select('*').eq('tenant_id',profile.tenant_id).eq('is_default',true).maybeSingle()
    if(row)setData({...blank,...row})
    setStatus('พร้อมออกแบบบิล')
  })()},[supabase])

  const set=(k:keyof Template,v:string|boolean)=>setData(s=>({...s,[k]:v}))
  const save=async(e:FormEvent)=>{
    e.preventDefault(); if(!tenantId)return
    setSaving(true); setStatus('กำลังบันทึก...')
    const payload={...data,tenant_id:tenantId,is_default:true,updated_at:new Date().toISOString()}
    const {error}=await supabase.from('tenant_bill_templates').upsert(payload,{onConflict:'tenant_id,template_name'})
    setSaving(false); setStatus(error?`บันทึกไม่สำเร็จ: ${error.message}`:'บันทึกแบบบิลแล้ว')
  }

  return <form onSubmit={save} className="section">
    <section className="card">
      <div className="toolbar"><div><h2>ออกแบบบิลด้วยการติ๊ก</h2><p className="muted">เลือกเฉพาะสิ่งที่ต้องการให้ผู้เช่าเห็น ตัวเลขคำนวณจริงยังมาจาก invoice และ invoice_items เหมือนเดิม</p></div><span className="pill">{status}</span></div>
      <div className="formGrid"><label>ชื่อแบบบิล<input value={data.template_name} onChange={e=>set('template_name',e.target.value)}/></label><label>หัวบิล<input value={data.bill_title} onChange={e=>set('bill_title',e.target.value)}/></label></div>
    </section>

    <section className="card section"><h2>เลือกสิ่งที่จะแสดงในบิล</h2><div className="formGrid">{checks.map(([key,label])=><label key={key} style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={Boolean(data[key])} onChange={e=>set(key,e.target.checked)}/><span>{label}</span></label>)}</div></section>

    <section className="card section"><h2>ข้อมูลรับชำระ</h2><div className="formGrid"><label>ธนาคาร<input value={data.payment_bank_name} onChange={e=>set('payment_bank_name',e.target.value)}/></label><label>ชื่อบัญชี<input value={data.payment_account_name} onChange={e=>set('payment_account_name',e.target.value)}/></label><label>เลขบัญชี<input value={data.payment_account_no} onChange={e=>set('payment_account_no',e.target.value)}/></label><label className="span2">หมายเหตุท้ายบิล<textarea value={data.footer_note} onChange={e=>set('footer_note',e.target.value)} placeholder="เช่น กรุณาชำระภายในวันที่กำหนด"/></label></div></section>

    <section className="card section"><h2>ตัวอย่างบิล</h2><div className="card" style={{maxWidth:640,margin:'0 auto'}}>
      {data.show_logo&&<div className="muted">[ โลโก้หอ ]</div>}<h2>{data.bill_title}</h2>
      {data.show_resident_name&&<div className="infoRow"><span>ผู้เช่า</span><strong>ตัวอย่าง ผู้เช่า</strong></div>}
      {data.show_room&&<div className="infoRow"><span>ห้อง</span><strong>A101</strong></div>}
      {data.show_period&&<div className="infoRow"><span>รอบบิล</span><strong>08/2026</strong></div>}
      {data.show_due_date&&<div className="infoRow"><span>ครบกำหนด</span><strong>05/09/2026</strong></div>}
      {data.show_rent&&<div className="infoRow"><span>ค่าเช่า</span><strong>5,000</strong></div>}
      {data.show_water&&<div className="infoRow"><span>ค่าน้ำ</span><strong>180</strong></div>}
      {data.show_electric&&<div className="infoRow"><span>ค่าไฟ</span><strong>720</strong></div>}
      {data.show_other&&<div className="infoRow"><span>ค่าใช้จ่ายอื่น</span><strong>0</strong></div>}
      {data.show_late_fee&&<div className="infoRow"><span>ค่าปรับ</span><strong>0</strong></div>}
      <div className="infoRow"><span><strong>ยอดรวม</strong></span><strong>5,900 บาท</strong></div>
      {data.show_meter_detail&&<p className="muted">มิเตอร์: แสดงเลขก่อน/หลังและหน่วยที่ใช้</p>}
      {data.show_payment_account&&<p className="muted">ชำระ: {data.payment_bank_name||'ธนาคาร'} · {data.payment_account_no||'เลขบัญชี'} · {data.payment_account_name||'ชื่อบัญชี'}</p>}
      {data.show_payment_qr&&<div className="muted">[ QR ชำระเงิน ]</div>}
      {data.show_receipt_status&&<p><span className="pill">รอชำระ</span></p>}
      {data.show_footer_note&&data.footer_note&&<p className="muted">{data.footer_note}</p>}
    </div></section>

    <div className="section"><button className="btn" disabled={!tenantId||saving}>{saving?'กำลังบันทึก...':'บันทึกแบบบิล'}</button></div>
  </form>
}
