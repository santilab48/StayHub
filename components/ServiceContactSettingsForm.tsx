'use client'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

type Contact={service_type:'moving_truck'|'motorbike_taxi'|'owner_contact';title:string;phone:string;is_active:boolean}
const defaults:Contact[]=[
  {service_type:'moving_truck',title:'รถขนของ',phone:'',is_active:true},
  {service_type:'motorbike_taxi',title:'เรียกวิน',phone:'',is_active:true},
  {service_type:'owner_contact',title:'ติดต่อเจ้าของ',phone:'',is_active:true}
]
export default function ServiceContactSettingsForm(){
 const supabase=useMemo(()=>createSupabaseBrowser(),[])
 const [tenantId,setTenantId]=useState(''); const [rows,setRows]=useState<Contact[]>(defaults); const [status,setStatus]=useState('กำลังตรวจสิทธิ์...'); const [saving,setSaving]=useState(false)
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setStatus('รอเชื่อมบัญชีเจ้าของ');return}const {data:p}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle();if(!p||!['owner','admin','staff'].includes(p.role)){setStatus('ไม่มีสิทธิ์แก้ไข');return}setTenantId(p.tenant_id);const {data}=await supabase.from('tenant_service_contacts').select('service_type,title,phone,is_active').eq('tenant_id',p.tenant_id);if(data?.length){setRows(defaults.map(d=>({...d,...data.find(x=>x.service_type===d.service_type)})))}setStatus('พร้อมแก้ไข')})()},[supabase])
 const change=(i:number,key:keyof Contact,value:string|boolean)=>setRows(v=>v.map((r,n)=>n===i?{...r,[key]:value}:r))
 const save=async(e:FormEvent)=>{e.preventDefault();if(!tenantId)return;setSaving(true);setStatus('กำลังบันทึก...');const payload=rows.map((r,i)=>({...r,tenant_id:tenantId,sort_order:i,updated_at:new Date().toISOString()}));const {error}=await supabase.from('tenant_service_contacts').upsert(payload,{onConflict:'tenant_id,service_type'});setSaving(false);setStatus(error?`บันทึกไม่สำเร็จ: ${error.message}`:'บันทึกบริการแล้ว')}
 return <form onSubmit={save} className="card section"><div className="toolbar"><div><h2>บริการติดต่อผู้เช่า</h2><p className="muted">เจ้าของกำหนดหัวข้อและเบอร์เองได้ ยกเว้น Grab ที่เปิดแอป/ลิงก์โดยตรง</p></div><span className="pill">{status}</span></div><div className="section">{rows.map((r,i)=><div className="formGrid section" key={r.service_type}><label>หัวข้อ<input value={r.title} onChange={e=>change(i,'title',e.target.value)}/></label><label>เบอร์โทร<input value={r.phone} onChange={e=>change(i,'phone',e.target.value)} placeholder="เช่น 08x-xxx-xxxx"/></label><label><input type="checkbox" checked={r.is_active} onChange={e=>change(i,'is_active',e.target.checked)}/> เปิดใช้งาน</label></div>)}</div><button className="btn" disabled={!tenantId||saving}>{saving?'กำลังบันทึก...':'บันทึกบริการ'}</button></form>
}
