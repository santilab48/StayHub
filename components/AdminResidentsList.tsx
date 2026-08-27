'use client'

import {useEffect,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type Lease={id:string;room_id:string;profile_id:string;start_date:string;end_date:string|null;rent_amount:number;status:string}
type Profile={id:string;full_name:string|null;phone:string|null;line_user_id:string|null}
type Room={id:string;room_no:string;status:string}
type Invoice={room_id:string;total_amount:number|null;status:string}
type ResidentRow={lease:Lease;profile:Profile|null;room:Room|null;outstanding:number}

const fmtDate=(v:string|null)=>v?new Date(v+'T00:00:00').toLocaleDateString('th-TH'):'—'
const fmtMoney=(v:number)=>Number(v||0).toLocaleString('th-TH')+' บาท'

export default function AdminResidentsList({slug}:{slug:string}){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [rows,setRows]=useState<ResidentRow[]>([])
  const [loading,setLoading]=useState(true)
  const [status,setStatus]=useState('กำลังดึงผู้เช่า...')
  const [query,setQuery]=useState('')
  const [filter,setFilter]=useState('active')

  useEffect(()=>{(async()=>{
    setLoading(true);setStatus('กำลังดึงผู้เช่าจากห้องที่ผูกไว้...')
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('กรุณาเข้าสู่ระบบหลังบ้าน');setLoading(false);return}
    const {data:me}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
    if(!me||!['owner','admin','staff'].includes(me.role)){setStatus('ไม่มีสิทธิ์ดูผู้เช่า');setLoading(false);return}

    const [{data:leases,error:leaseError},{data:profiles},{data:rooms},{data:invoices}]=await Promise.all([
      supabase.from('leases').select('id,room_id,profile_id,start_date,end_date,rent_amount,status').eq('tenant_id',me.tenant_id).order('start_date',{ascending:false}),
      supabase.from('profiles').select('id,full_name,phone,line_user_id').eq('tenant_id',me.tenant_id),
      supabase.from('rooms').select('id,room_no,status').eq('tenant_id',me.tenant_id).order('room_no'),
      supabase.from('invoices').select('room_id,total_amount,status').eq('tenant_id',me.tenant_id).in('status',['unpaid','overdue','pending_review'])
    ])
    if(leaseError){setStatus(`ดึงผู้เช่าไม่สำเร็จ: ${leaseError.message}`);setLoading(false);return}

    const profileMap=new Map((profiles||[]).map((p:any)=>[p.id,p as Profile]))
    const roomMap=new Map((rooms||[]).map((r:any)=>[r.id,r as Room]))
    const outstandingMap=new Map<string,number>()
    for(const inv of (invoices||[]) as Invoice[]){outstandingMap.set(inv.room_id,(outstandingMap.get(inv.room_id)||0)+Number(inv.total_amount||0))}

    const result=((leases||[]) as Lease[]).map(l=>({lease:l,profile:profileMap.get(l.profile_id)||null,room:roomMap.get(l.room_id)||null,outstanding:outstandingMap.get(l.room_id)||0}))
    result.sort((a,b)=>(a.room?.room_no||'').localeCompare(b.room?.room_no||'',undefined,{numeric:true}))
    setRows(result)
    setStatus(result.length?`พบผู้เช่าที่ผูกกับสัญญา ${result.length} รายการ`:'ยังไม่มีผู้เช่าที่ผูกกับห้อง')
    setLoading(false)
  })()},[supabase])

  const filtered=rows.filter(x=>{
    if(filter==='active'&&x.lease.status!=='active')return false
    if(filter==='debt'&&x.outstanding<=0)return false
    if(filter==='moving'&&x.lease.status!=='ending'&&x.lease.status!=='notice_given')return false
    const q=query.trim().toLowerCase()
    if(!q)return true
    return [x.profile?.full_name,x.profile?.phone,x.room?.room_no].some(v=>String(v||'').toLowerCase().includes(q))
  })

  return <>
    <section className="card">
      <div className="toolbar">
        <div><h2>สมาชิกผู้เช่าปัจจุบัน</h2><p className="muted">ดึงอัตโนมัติจาก ผู้เช่า → active lease → ห้อง ไม่ต้องเพิ่มผู้เช่าซ้ำในหน้านี้</p></div>
        <a className="btn secondary" href={`/t/${slug}/admin/general`}>ไปผูกผู้เช่ากับห้อง</a>
      </div>
      <p className="muted">{status}</p>
    </section>

    <section className="section card">
      <div className="toolbar">
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาชื่อ / ห้อง / เบอร์โทร"/>
        <select value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="active">กำลังเข้าพัก</option>
          <option value="all">ทั้งหมด</option>
          <option value="debt">มียอดค้าง</option>
          <option value="moving">กำลังย้ายออก</option>
        </select>
      </div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th align="left">ห้อง</th><th align="left">ชื่อ</th><th align="left">เบอร์โทร</th><th align="left">วันที่เข้า</th><th align="left">หมดสัญญา</th><th align="right">ค่าเช่า</th><th align="right">ยอดค้าง</th><th align="left">สถานะ</th></tr></thead>
        <tbody>
          {loading?<tr><td colSpan={8}>กำลังโหลด...</td></tr>:filtered.length===0?<tr><td colSpan={8}>ไม่พบผู้เช่าตามเงื่อนไข</td></tr>:filtered.map(x=><tr key={x.lease.id}>
            <td><strong>{x.room?.room_no||'—'}</strong></td>
            <td>{x.profile?.full_name||'—'}</td>
            <td>{x.profile?.phone||'—'}{x.profile?.line_user_id?<div className="muted">LINE เชื่อมแล้ว</div>:null}</td>
            <td>{fmtDate(x.lease.start_date)}</td>
            <td>{fmtDate(x.lease.end_date)}</td>
            <td align="right">{fmtMoney(Number(x.lease.rent_amount||0))}</td>
            <td align="right"><strong>{fmtMoney(x.outstanding)}</strong></td>
            <td><span className="pill">{x.lease.status==='active'?'กำลังเข้าพัก':x.lease.status}</span></td>
          </tr>)}
        </tbody>
      </table></div>
    </section>

    <section className="section card noticeBox"><strong>ข้อมูลชุดเดียวกับห้อง</strong><p className="muted">เมื่อเจ้าบ้านผูกผู้เช่าในแท็บทั่วไป รายชื่อนี้จะขึ้นอัตโนมัติจาก lease เดิม ไม่สร้างสำเนาผู้เช่าใหม่</p></section>
  </>
}
