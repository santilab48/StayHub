'use client'
import {useEffect,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../lib/supabase-browser'
import InlineSlipUpload from './InlineSlipUpload'

type Invoice={id:string;tenant_id:string;room_id:string;period:string;rent_amount:number;water_amount:number;electric_amount:number;other_amount:number;late_fee:number;total_amount:number|null;due_date:string|null;status:string}
type Room={room_no:string}
const money=(v:number|null|undefined)=>Number(v||0).toLocaleString('th-TH')+' บาท'
export default function ResidentInvoiceDetail({invoiceId}:{invoiceId:string}){
 const supabase=useMemo(()=>createSupabaseBrowser(),[])
 const [invoice,setInvoice]=useState<Invoice|null>(null),[room,setRoom]=useState<Room|null>(null)
 const [status,setStatus]=useState('กำลังโหลดบิล...')
 useEffect(()=>{(async()=>{
   const {data:{user}}=await supabase.auth.getUser(); if(!user){setStatus('กรุณาเข้าสู่ระบบ');return}
   const {data:i,error}=await supabase.from('invoices').select('id,tenant_id,room_id,period,rent_amount,water_amount,electric_amount,other_amount,late_fee,total_amount,due_date,status').eq('id',invoiceId).maybeSingle()
   if(error||!i){setStatus('ไม่พบบิลนี้ หรือบัญชีนี้ไม่มีสิทธิ์ดู');return}
   setInvoice(i as Invoice)
   const {data:r}=await supabase.from('rooms').select('room_no').eq('id',i.room_id).maybeSingle(); setRoom(r as Room|null)
   setStatus('พร้อมชำระ')
 })()},[invoiceId,supabase])
 if(!invoice)return <section className="card"><h3>รายละเอียดบิล</h3><p className="muted">{status}</p></section>
 const total=Number(invoice.total_amount??(Number(invoice.rent_amount)+Number(invoice.water_amount)+Number(invoice.electric_amount)+Number(invoice.other_amount)+Number(invoice.late_fee)))
 const canPay=['unpaid','overdue'].includes(invoice.status)
 return <>
  <section className="card"><div className="toolbar"><div><span className="eyebrow">INVOICE</span><h2>รายละเอียดบิล</h2><p className="muted">ข้อมูลนี้อ่านจากบิลของห้องที่บัญชีผู้ใช้มีสิทธิ์เท่านั้น</p></div><span className="pill">#{invoice.id.slice(0,8)}</span></div></section>
  <section className="section card"><h3>สรุปยอด</h3><div className="infoRow"><span className="muted">รอบบิล</span><strong>{invoice.period}</strong></div><div className="infoRow"><span className="muted">ห้อง</span><strong>{room?.room_no||'—'}</strong></div><div className="infoRow"><span className="muted">วันครบกำหนด</span><strong>{invoice.due_date?new Date(invoice.due_date).toLocaleDateString('th-TH'):'—'}</strong></div><div className="infoRow"><span className="muted">สถานะ</span><strong>{invoice.status}</strong></div><div className="infoRow"><span className="muted">ยอดรวม</span><strong>{money(total)}</strong></div></section>
  <section className="section card"><h3>รายละเอียดค่าใช้จ่าย</h3><div className="infoRow"><span className="muted">ค่าเช่า</span><strong>{money(invoice.rent_amount)}</strong></div><div className="infoRow"><span className="muted">ค่าน้ำ</span><strong>{money(invoice.water_amount)}</strong></div><div className="infoRow"><span className="muted">ค่าไฟ</span><strong>{money(invoice.electric_amount)}</strong></div><div className="infoRow"><span className="muted">ค่าใช้จ่ายอื่น</span><strong>{money(invoice.other_amount)}</strong></div><div className="infoRow"><span className="muted">ค่าปรับ</span><strong>{money(invoice.late_fee)}</strong></div></section>
  {canPay?<InlineSlipUpload tenantId={invoice.tenant_id} invoiceId={invoice.id} amount={total}/>:<section className="section card noticeBox"><strong>{invoice.status==='pending_review'?'ส่งสลิปแล้ว · รอตรวจ':'บิลนี้ไม่เปิดรับสลิปเพิ่ม'}</strong></section>}
 </>
}
