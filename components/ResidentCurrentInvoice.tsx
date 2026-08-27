'use client'

import {useEffect,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type Invoice={id:string;invoice_no:string|null;issued_at:string|null;period:string;resident_name:string|null;resident_phone:string|null;issuer_name:string|null;issuer_address:string|null;total_amount:number|null;due_date:string|null;status:string;water_previous_value:number|null;water_current_value:number|null;electric_previous_value:number|null;electric_current_value:number|null}
type Item={id:string;description:string;quantity:number;unit_price:number;amount:number}

const fmtDate=(v:string|null)=>v?new Date(`${v}T00:00:00`).toLocaleDateString('th-TH'):'—'

export default function ResidentCurrentInvoice(){
 const supabase=useMemo(()=>createSupabaseBrowser(),[])
 const [invoice,setInvoice]=useState<Invoice|null>(null),[items,setItems]=useState<Item[]>([]),[roomNo,setRoomNo]=useState(''),[status,setStatus]=useState('กำลังโหลดบิล...')
 useEffect(()=>{(async()=>{
  const {data:{user}}=await supabase.auth.getUser();if(!user){setStatus('กรุณาเข้าสู่ระบบ');return}
  const {data:p}=await supabase.from('profiles').select('id').eq('auth_user_id',user.id).maybeSingle();if(!p){setStatus('ไม่พบข้อมูลสมาชิก');return}
  const {data:l}=await supabase.from('leases').select('room_id').eq('profile_id',p.id).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();if(!l){setStatus('ยังไม่มีห้องที่ผูกกับสมาชิกนี้');return}
  const [{data:r},{data:i,error}]=await Promise.all([
   supabase.from('rooms').select('room_no').eq('id',l.room_id).maybeSingle(),
   supabase.from('invoices').select('id,invoice_no,issued_at,period,resident_name,resident_phone,issuer_name,issuer_address,total_amount,due_date,status,water_previous_value,water_current_value,electric_previous_value,electric_current_value').eq('room_id',l.room_id).not('published_to_room_at','is',null).order('published_to_room_at',{ascending:false}).limit(1).maybeSingle()
  ])
  if(error){setStatus(`โหลดบิลไม่สำเร็จ: ${error.message}`);return}
  setRoomNo(r?.room_no||'')
  if(!i){setStatus('ยังไม่มีบิลที่เจ้าของหอส่งมา');return}
  setInvoice(i as Invoice)
  const {data:rows}=await supabase.from('invoice_items').select('id,description,quantity,unit_price,amount').eq('invoice_id',i.id).order('created_at')
  setItems((rows||[]) as Item[]);setStatus('')
 })()},[supabase])
 if(status)return <section className="card"><h2>🧾 บิลปัจจุบัน</h2><p className="muted">{status}</p></section>
 if(!invoice)return null
 return <section className="card" style={{padding:'28px'}}>
  <div className="toolbar" style={{alignItems:'flex-start'}}><div><span className="pill warn">{invoice.status==='paid'?'ชำระแล้ว':'ยังไม่ชำระ'}</span><h2>{invoice.issuer_name||'ใบแจ้งค่าใช้จ่าย'}</h2><p className="muted" style={{whiteSpace:'pre-wrap'}}>{invoice.issuer_address||''}</p></div><div style={{textAlign:'right'}}><span className="muted">เลขที่บิล</span><br/><strong>{invoice.invoice_no||'—'}</strong><div style={{marginTop:8}}><span className="muted">วันที่ออกบิล</span><br/><strong>{fmtDate(invoice.issued_at)}</strong></div></div></div>
  <hr/>
  <div className="splitGrid section"><div><span className="muted">เรียกเก็บจาก</span><h3>{invoice.resident_name||'ผู้เช่า'}</h3><p>ห้อง {roomNo}{invoice.resident_phone?` · ${invoice.resident_phone}`:''}</p></div><div><div className="infoRow"><span>รอบบิล</span><strong>{invoice.period}</strong></div><div className="infoRow"><span>ครบกำหนด</span><strong>{fmtDate(invoice.due_date)}</strong></div></div></div>
  <div className="section"><div className="infoRow"><strong>รายการ</strong><strong>จำนวนเงิน</strong></div>{items.map(i=><div className="infoRow" key={i.id}><span>{i.description}{Number(i.quantity)!==1?` · ${Number(i.quantity)} × ${Number(i.unit_price).toLocaleString()}`:''}</span><strong>{Number(i.amount).toLocaleString()} บาท</strong></div>)}</div>
  <div className="section" style={{borderTop:'2px solid currentColor',paddingTop:16}}><div className="toolbar"><strong style={{fontSize:'1.2rem'}}>ยอดรวมทั้งสิ้น</strong><strong style={{fontSize:'2rem'}}>{Number(invoice.total_amount||0).toLocaleString()} บาท</strong></div></div>
  <section className="section noticeBox"><strong>รายละเอียดมิเตอร์</strong><p className="muted">น้ำ {invoice.water_previous_value??'—'} → {invoice.water_current_value??'—'} · ไฟ {invoice.electric_previous_value??'—'} → {invoice.electric_current_value??'—'}</p></section>
 </section>
}
