'use client'
import { FormEvent,useEffect,useMemo,useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

type Req={id:string;base_amount:number;room_unit_price:number;room_count:number;room_amount:number;total_amount:number;status:string;created_at:string}

export default function SuperAdminTenantRentalControl({tenantId}:{tenantId:string}){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [base,setBase]=useState(0),[perRoom,setPerRoom]=useState(0),[limit,setLimit]=useState(0)
  const [requests,setRequests]=useState<Req[]>([])
  const [status,setStatus]=useState('กำลังโหลด...'),[saving,setSaving]=useState(false)
  const load=async()=>{
    const {data:t,error}=await supabase.from('tenants').select('rental_price_monthly,room_price_monthly,licensed_room_count').eq('id',tenantId).maybeSingle()
    if(error){setStatus(error.message);return}
    setBase(Number(t?.rental_price_monthly||0));setPerRoom(Number(t?.room_price_monthly||0));setLimit(Number(t?.licensed_room_count||0))
    const {data:r}=await supabase.from('tenant_rental_requests').select('id,base_amount,room_unit_price,room_count,room_amount,total_amount,status,created_at').eq('tenant_id',tenantId).order('created_at',{ascending:false}).limit(10)
    setRequests((r||[]) as Req[]);setStatus('พร้อมจัดการ')
  }
  useEffect(()=>{load()},[tenantId])
  const save=async(e:FormEvent)=>{e.preventDefault();setSaving(true);const {error}=await supabase.from('tenants').update({rental_price_monthly:base,room_price_monthly:perRoom,licensed_room_count:limit,updated_at:new Date().toISOString()}).eq('id',tenantId);setSaving(false);setStatus(error?error.message:'บันทึกราคาและสิทธิ์แล้ว')}
  const approve=async(r:Req)=>{setStatus('กำลังอนุมัติ...');const {error:e1}=await supabase.from('tenants').update({licensed_room_count:r.room_count,billing_status:'active',updated_at:new Date().toISOString()}).eq('id',tenantId);if(e1){setStatus(e1.message);return}const {error:e2}=await supabase.from('tenant_rental_requests').update({status:'approved',reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',r.id);setStatus(e2?e2.message:'อนุมัติและตั้งจำนวนห้องแล้ว');await load()}
  return <section className="section card">
    <div className="toolbar"><div><h2>ค่าเช่า & จำกัดการใช้งาน</h2><p className="muted">Super Admin ตั้งราคาฐาน ราคาต่อห้อง และจำนวนห้องที่ OA ใช้งานได้จริง</p></div><span className="pill">{status}</span></div>
    <form onSubmit={save} className="section"><div className="formGrid"><label>ค่าเช่าหลัก/เดือน<input type="number" min="0" value={base} onChange={e=>setBase(Number(e.target.value))}/></label><label>ค่าต่อห้อง/เดือน<input type="number" min="0" value={perRoom} onChange={e=>setPerRoom(Number(e.target.value))}/></label><label>จำนวนห้องที่อนุญาต<input type="number" min="0" value={limit} onChange={e=>setLimit(Number(e.target.value))}/></label></div><div className="section"><button className="btn" disabled={saving}>{saving?'กำลังบันทึก...':'บันทึกการตั้งค่า'}</button></div></form>
    <div className="section"><h3>คำขอจาก OA</h3>{requests.length===0?<p className="muted">ยังไม่มีคำขอ</p>:requests.map(r=><div className="row" key={r.id}><div><strong>{r.room_count} ห้อง · {Number(r.total_amount).toLocaleString()} บาท/เดือน</strong><div className="muted">ฐาน {Number(r.base_amount).toLocaleString()} + {r.room_count} × {Number(r.room_unit_price).toLocaleString()} = {Number(r.total_amount).toLocaleString()} · {r.status}</div></div>{r.status==='pending'&&<button className="btn" onClick={()=>approve(r)}>อนุมัติ + จำกัด {r.room_count} ห้อง</button>}</div>)}</div>
  </section>
}
