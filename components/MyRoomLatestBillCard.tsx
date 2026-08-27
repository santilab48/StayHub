'use client'

import {useEffect,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../lib/supabase-browser'
import {tenantRoutes} from '../lib/routes'

type Bill={invoice_no:string|null;period:string;total_amount:number|null;due_date:string|null;status:string}

const fmtDate=(v:string|null)=>v?new Date(`${v}T00:00:00`).toLocaleDateString('th-TH'):'—'

export default function MyRoomLatestBillCard({slug}:{slug:string}){
 const supabase=useMemo(()=>createSupabaseBrowser(),[]),r=tenantRoutes(slug)
 const [bill,setBill]=useState<Bill|null>(null)
 useEffect(()=>{(async()=>{
  const {data:{user}}=await supabase.auth.getUser();if(!user)return
  const {data:p}=await supabase.from('profiles').select('id').eq('auth_user_id',user.id).maybeSingle();if(!p)return
  const {data:l}=await supabase.from('leases').select('room_id').eq('profile_id',p.id).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();if(!l)return
  const {data:i}=await supabase.from('invoices').select('invoice_no,period,total_amount,due_date,status').eq('room_id',l.room_id).not('published_to_room_at','is',null).order('published_to_room_at',{ascending:false}).limit(1).maybeSingle()
  setBill(i as Bill|null)
 })()},[supabase])
 if(!bill)return null
 return <section className="myRoomParcelAlert"><div><span>🧾</span><div><strong>บิลรอบ {bill.period} · {Number(bill.total_amount||0).toLocaleString()} บาท</strong><small>{bill.invoice_no||'ใบแจ้งค่าใช้จ่าย'} · ครบกำหนด {fmtDate(bill.due_date)}</small></div></div><a href={r.billingCurrent}>ดูบิล</a></section>
}
