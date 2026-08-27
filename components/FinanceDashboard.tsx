'use client'

import {useEffect,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type Row={id:string;amount:number;reviewed_at:string|null;invoice_id:string;invoice?:{invoice_no:string|null;period:string|null;resident_name:string|null;room_id:string}|null;roomNo?:string}
const monthNow=()=>new Date().toISOString().slice(0,7)
const baht=(n:number)=>`${Number(n||0).toLocaleString('th-TH')} บาท`
const dt=(v:string|null)=>v?new Date(v).toLocaleDateString('th-TH'):'—'

export default function FinanceDashboard(){
 const supabase=useMemo(()=>createSupabaseBrowser(),[])
 const [month,setMonth]=useState(monthNow())
 const [rows,setRows]=useState<Row[]>([])
 const [status,setStatus]=useState('กำลังโหลด...')

 const load=async()=>{
  setStatus('กำลังโหลดรายงาน...')
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){setStatus('กรุณาเข้าสู่ระบบหลังบ้าน');return}
  const {data:p}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
  if(!p||!['owner','admin','staff'].includes(p.role)){setStatus('ไม่มีสิทธิ์ดูการเงิน');return}
  const start=`${month}-01T00:00:00`
  const next=new Date(`${month}-01T00:00:00`);next.setMonth(next.getMonth()+1)
  const end=next.toISOString()
  const {data:payments,error}=await supabase.from('payments')
   .select('id,amount,reviewed_at,invoice_id')
   .eq('tenant_id',p.tenant_id).eq('status','approved')
   .gte('reviewed_at',start).lt('reviewed_at',end)
   .order('reviewed_at',{ascending:false})
  if(error){setStatus(`โหลดรายงานไม่สำเร็จ: ${error.message}`);return}
  const list=(payments||[]) as Row[]
  const invoiceIds=[...new Set(list.map(x=>x.invoice_id).filter(Boolean))]
  let invoiceMap:Record<string,any>={}
  if(invoiceIds.length){
   const {data:invoices}=await supabase.from('invoices').select('id,invoice_no,period,resident_name,room_id').in('id',invoiceIds)
   for(const inv of invoices||[])invoiceMap[inv.id]=inv
  }
  const roomIds=[...new Set(Object.values(invoiceMap).map((x:any)=>x.room_id).filter(Boolean))]
  let roomMap:Record<string,string>={}
  if(roomIds.length){
   const {data:rooms}=await supabase.from('rooms').select('id,room_no').in('id',roomIds)
   for(const room of rooms||[])roomMap[room.id]=room.room_no
  }
  setRows(list.map(x=>({...x,invoice:invoiceMap[x.invoice_id]||null,roomNo:invoiceMap[x.invoice_id]?.room_id?roomMap[invoiceMap[x.invoice_id].room_id]:'—'})))
  setStatus('รายงานจากยอดที่ตรวจผ่านจริง')
 }
 useEffect(()=>{void load()},[month])
 const total=rows.reduce((s,x)=>s+Number(x.amount||0),0)
 const roomsPaid=new Set(rows.map(x=>x.roomNo).filter(x=>x&&x!=='—')).size
 return <div className="financeDashboard">
  <section className="financeHero card">
   <div><span className="eyebrow">FINANCE</span><h2>การเงินรายเดือน</h2><p className="muted">รวมเฉพาะยอดชำระบิลที่ตรวจสลิปผ่านแล้ว</p></div>
   <label className="monthPick">เดือน<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>
  </section>
  <section className="financeMetrics">
   <div className="financeMetric card"><span className="muted">รับชำระแล้ว</span><strong>{baht(total)}</strong></div>
   <div className="financeMetric card"><span className="muted">จำนวนรายการ</span><strong>{rows.length}</strong></div>
   <div className="financeMetric card"><span className="muted">ห้องที่ชำระ</span><strong>{roomsPaid}</strong></div>
  </section>
  <section className="card financeList">
   <div className="toolbar"><div><h3>รายการรับชำระ</h3><p className="muted">{status}</p></div><span className="pill">{month}</span></div>
   {rows.length===0?<div className="emptyFinance"><strong>ยังไม่มียอดชำระที่อนุมัติในเดือนนี้</strong><p className="muted">เมื่อสลิปถูกอนุมัติ รายการจะเข้าหน้านี้อัตโนมัติ</p></div>:rows.map(x=><div className="financeRow" key={x.id}><div><strong>ห้อง {x.roomNo||'—'} · {x.invoice?.resident_name||'—'}</strong><p className="muted">{x.invoice?.invoice_no||'ไม่พบเลขที่บิล'} · รับชำระ {dt(x.reviewed_at)}</p></div><strong className="financeAmount">{baht(x.amount)}</strong></div>)}
   <div className="financeTotal"><span>รวมเดือนนี้</span><strong>{baht(total)}</strong></div>
  </section>
  <style jsx>{`
   .financeDashboard{display:grid;gap:16px}.financeHero{display:flex;justify-content:space-between;align-items:end;gap:20px;padding:24px}.financeHero h2{margin:6px 0}.monthPick{min-width:180px}.monthPick input{margin-top:8px}.financeMetrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.financeMetric{padding:20px}.financeMetric strong{display:block;font-size:clamp(22px,3vw,34px);margin-top:8px}.financeList{padding:22px}.financeRow{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 0;border-bottom:1px solid #e8edf3}.financeRow p{margin:5px 0 0}.financeAmount{font-size:20px}.financeTotal{display:flex;justify-content:space-between;align-items:center;padding-top:22px;font-size:20px}.financeTotal strong{font-size:30px}.emptyFinance{text-align:center;padding:42px 16px}@media(max-width:680px){.financeHero{align-items:stretch;flex-direction:column;padding:18px}.monthPick{min-width:0}.financeMetrics{grid-template-columns:1fr}.financeList{padding:18px}.financeRow{align-items:flex-start}.financeAmount{white-space:nowrap}.financeTotal strong{font-size:25px}}
  `}</style>
 </div>
}
