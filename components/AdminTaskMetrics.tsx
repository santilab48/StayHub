'use client'
import {useEffect,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type Counts={overdue:number;repairs:number;pendingSlips:number;expiring:number;oldParcels:number;billsToIssue:number}
const empty:Counts={overdue:0,repairs:0,pendingSlips:0,expiring:0,oldParcels:0,billsToIssue:0}
export default function AdminTaskMetrics(){
 const supabase=useMemo(()=>createSupabaseBrowser(),[]),[c,setC]=useState<Counts>(empty),[status,setStatus]=useState('กำลังโหลด...')
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setStatus('ยังไม่ได้เข้าสู่ระบบ');return};const {data:p}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle();if(!p||!['owner','admin','staff'].includes(p.role)){setStatus('ไม่มีสิทธิ์');return}
 const now=new Date(),future=new Date(now);future.setDate(future.getDate()+30);const parcelCutoff=new Date(now);parcelCutoff.setDate(parcelCutoff.getDate()-3);const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
 const [inv,rep,pay,lease,par,activeLeases,currentInv]=await Promise.all([
  supabase.from('invoices').select('room_id').eq('status','overdue'),
  supabase.from('maintenance_tickets').select('id').is('closed_at',null),
  supabase.from('payments').select('id').eq('status','pending'),
  supabase.from('leases').select('id').in('status',['active','tenant_signed']).gte('end_date',now.toISOString().slice(0,10)).lte('end_date',future.toISOString().slice(0,10)),
  supabase.from('parcels').select('id').eq('status','waiting').lte('arrived_at',parcelCutoff.toISOString()),
  supabase.from('leases').select('room_id').in('status',['active','tenant_signed']),
  supabase.from('invoices').select('room_id').eq('period',ym)
 ]);
 const activeRooms=new Set((activeLeases.data||[]).map((x:any)=>x.room_id)), billed=new Set((currentInv.data||[]).map((x:any)=>x.room_id));let missing=0;activeRooms.forEach(id=>{if(!billed.has(id))missing++})
 setC({overdue:new Set((inv.data||[]).map((x:any)=>x.room_id)).size,repairs:(rep.data||[]).length,pendingSlips:(pay.data||[]).length,expiring:(lease.data||[]).length,oldParcels:(par.data||[]).length,billsToIssue:missing});setStatus('ข้อมูลล่าสุด')})()},[supabase])
 const items=[['ค่าห้องค้าง',c.overdue,'ห้อง'],['งานซ่อมค้าง',c.repairs,'งาน'],['บิลที่ต้องออก',c.billsToIssue,'ห้อง'],['สลิปรอตรวจ',c.pendingSlips,'รายการ'],['สัญญาใกล้หมด',c.expiring,'ห้อง'],['พัสดุรอรับนาน',c.oldParcels,'ชิ้น']]
 return <><div className="metricGrid section"><div className="metric"><span className="muted">ค้างชำระ</span><strong>{c.overdue}</strong></div><div className="metric"><span className="muted">งานซ่อม</span><strong>{c.repairs}</strong></div><div className="metric"><span className="muted">สลิปรอตรวจ</span><strong>{c.pendingSlips}</strong></div><div className="metric"><span className="muted">สถานะ</span><strong>{status}</strong></div></div><section className="section card"><h3>ตัวเลขงานวันนี้</h3>{items.map(([t,n,u])=><div className="infoRow" key={String(t)}><span className="muted">{t}</span><strong>{n} {u}</strong></div>)}</section></>
}
