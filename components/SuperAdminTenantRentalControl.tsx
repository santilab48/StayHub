'use client'
import { FormEvent,useEffect,useMemo,useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

type Req={id:string;base_amount:number;room_unit_price:number;room_count:number;room_amount:number;total_amount:number;status:string;created_at:string;slip_path:string|null;slip_submitted_at:string|null;rejection_reason:string|null}

export default function SuperAdminTenantRentalControl({tenantId}:{tenantId:string}){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [base,setBase]=useState(0),[perRoom,setPerRoom]=useState(0),[limit,setLimit]=useState(0)
  const [addRooms,setAddRooms]=useState(1)
  const [requests,setRequests]=useState<Req[]>([])
  const [slipUrls,setSlipUrls]=useState<Record<string,string>>({})
  const [status,setStatus]=useState('กำลังโหลด...'),[saving,setSaving]=useState(false)
  const load=async()=>{
    const {data:t,error}=await supabase.from('tenants').select('rental_price_monthly,room_price_monthly,licensed_room_count').eq('id',tenantId).maybeSingle()
    if(error){setStatus(error.message);return}
    setBase(Number(t?.rental_price_monthly||0));setPerRoom(Number(t?.room_price_monthly||0));setLimit(Number(t?.licensed_room_count||0))
    const {data:r}=await supabase.from('tenant_rental_requests').select('id,base_amount,room_unit_price,room_count,room_amount,total_amount,status,created_at,slip_path,slip_submitted_at,rejection_reason').eq('tenant_id',tenantId).order('created_at',{ascending:false}).limit(20)
    const rows=(r||[]) as Req[]
    setRequests(rows)
    const urls:Record<string,string>={}
    for(const item of rows){
      if(!item.slip_path)continue
      const {data}=await supabase.storage.from('stayhub-rental-slips').createSignedUrl(item.slip_path,600)
      if(data?.signedUrl)urls[item.id]=data.signedUrl
    }
    setSlipUrls(urls);setStatus('พร้อมตรวจสลิป')
  }
  useEffect(()=>{load()},[tenantId])
  const save=async(e:FormEvent)=>{e.preventDefault();setSaving(true);const {error}=await supabase.from('tenants').update({rental_price_monthly:base,room_price_monthly:perRoom,licensed_room_count:limit,updated_at:new Date().toISOString()}).eq('id',tenantId);setSaving(false);setStatus(error?error.message:'บันทึกราคาและสิทธิ์แล้ว')}
  const addRoomQuota=async()=>{
    const qty=Math.max(1,Math.floor(addRooms||1));const next=limit+qty
    setSaving(true);setStatus('กำลังเพิ่มจำนวนห้อง...')
    const {error}=await supabase.from('tenants').update({licensed_room_count:next,updated_at:new Date().toISOString()}).eq('id',tenantId)
    setSaving(false);if(error){setStatus(error.message);return}
    setLimit(next);setAddRooms(1);setStatus(`เพิ่มสิทธิ์แล้ว เป็น ${next} ห้อง`)
  }
  const approve=async(r:Req)=>{
    if(!r.slip_path){setStatus('ยังไม่มีสลิปให้ตรวจ');return}
    setStatus('กำลังรับชำระ...')
    const {error:e1}=await supabase.from('tenants').update({licensed_room_count:r.room_count,billing_status:'active',updated_at:new Date().toISOString()}).eq('id',tenantId)
    if(e1){setStatus(e1.message);return}
    const {error:e2}=await supabase.from('tenant_rental_requests').update({status:'approved',rejection_reason:null,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',r.id)
    setStatus(e2?e2.message:`รับชำระแล้ว และอนุมัติ ${r.room_count} ห้อง`);await load()
  }
  const reject=async(r:Req)=>{
    const reason=window.prompt('เหตุผลที่ปฏิเสธสลิป เช่น ยอดไม่ตรง / รูปไม่ชัด / ตรวจไม่พบรายการ')
    if(!reason)return
    setStatus('กำลังปฏิเสธสลิป...')
    const {error}=await supabase.from('tenant_rental_requests').update({status:'rejected',rejection_reason:reason,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',r.id)
    setStatus(error?error.message:'ปฏิเสธแล้ว รอ OA ส่งสลิปใหม่');await load()
  }
  return <section className="section card">
    <div className="toolbar"><div><h2>ค่าเช่า & จำกัดการใช้งาน</h2><p className="muted">Super Admin ตั้งราคา ตรวจสลิป และกำหนดจำนวนห้องที่ OA ใช้งานได้จริง</p></div><span className="pill">{status}</span></div>
    <form onSubmit={save} className="section"><div className="formGrid"><label>ค่าเช่าหลัก/เดือน<input type="number" min="0" value={base} onChange={e=>setBase(Number(e.target.value))}/></label><label>ค่าต่อห้อง/เดือน<input type="number" min="0" value={perRoom} onChange={e=>setPerRoom(Number(e.target.value))}/></label><label>จำนวนห้องที่อนุญาต<input type="number" min="0" value={limit} onChange={e=>setLimit(Number(e.target.value))}/></label></div><div className="section"><button className="btn" disabled={saving}>{saving?'กำลังบันทึก...':'บันทึกการตั้งค่า'}</button></div></form>
    <div className="section card"><div className="toolbar"><div><h3>➕ เพิ่มห้องให้ OA</h3><p className="muted">ใช้เมื่อ OA ขอเพิ่มห้องภายหลัง ปัจจุบันอนุญาต {limit} ห้อง</p></div><strong>{limit} ห้อง</strong></div><div className="formGrid section"><label>เพิ่มอีกกี่ห้อง<input type="number" min="1" value={addRooms} onChange={e=>setAddRooms(Math.max(1,Number(e.target.value)))}/></label><label>จำนวนหลังเพิ่ม<input value={`${limit+Math.max(1,Math.floor(addRooms||1))} ห้อง`} readOnly/></label></div><button type="button" className="btn" disabled={saving} onClick={addRoomQuota}>เพิ่มจำนวนห้อง</button></div>
    <div className="section"><h3>ตรวจสลิปค่าเช่า OA</h3>{requests.length===0?<p className="muted">ยังไม่มีรายการส่งชำระ</p>:requests.map(r=><div className="card section" key={r.id}><div className="toolbar"><div><strong>{r.room_count} ห้อง · {Number(r.total_amount).toLocaleString()} บาท/เดือน</strong><div className="muted">ฐาน {Number(r.base_amount).toLocaleString()} + {r.room_count} × {Number(r.room_unit_price).toLocaleString()} = {Number(r.total_amount).toLocaleString()}</div><div className="muted">ส่งเมื่อ {new Date(r.created_at).toLocaleString('th-TH')} · สถานะ {r.status}</div>{r.rejection_reason&&<div className="muted">เหตุผลปฏิเสธ: {r.rejection_reason}</div>}</div><span className="pill">{r.slip_path?'มีสลิป':'ยังไม่มีสลิป'}</span></div><div className="flow section">{slipUrls[r.id]&&<a className="btn secondary" href={slipUrls[r.id]} target="_blank" rel="noreferrer">เปิดดูสลิป</a>}{r.status==='pending'&&<><button type="button" className="btn" disabled={!r.slip_path} onClick={()=>approve(r)}>รับชำระ + เปิด {r.room_count} ห้อง</button><button type="button" className="btn secondary" onClick={()=>reject(r)}>ปฏิเสธสลิป</button></>}</div></div>)}</div>
  </section>
}
