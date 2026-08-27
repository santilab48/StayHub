'use client'

import {FormEvent,useEffect,useMemo,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type Room={id:string;room_no:string;monthly_rent:number|null;status:string}
type LeaseRow={id:string;profile_id:string;start_date:string;end_date:string|null;rent_amount:number;deposit_amount:number;status:string}
type ProfileRow={id:string;full_name:string|null;phone:string|null}

const today=()=>new Date().toISOString().slice(0,10)

export default function RoomTenantAssignmentForm(){
 const supabase=useMemo(()=>createSupabaseBrowser(),[])
 const search=useSearchParams()
 const roomId=search.get('room_id')||''
 const [room,setRoom]=useState<Room|null>(null)
 const [activeLease,setActiveLease]=useState<LeaseRow|null>(null)
 const [activeTenant,setActiveTenant]=useState<ProfileRow|null>(null)
 const [fullName,setFullName]=useState('')
 const [phone,setPhone]=useState('')
 const [startDate,setStartDate]=useState(today())
 const [endDate,setEndDate]=useState('')
 const [rent,setRent]=useState('')
 const [deposit,setDeposit]=useState('0')
 const [status,setStatus]=useState('')
 const [busy,setBusy]=useState(false)

 const load=async()=>{
  setStatus('');setRoom(null);setActiveLease(null);setActiveTenant(null)
  if(!roomId)return
  const {data:r,error:re}=await supabase.from('rooms').select('id,room_no,monthly_rent,status').eq('id',roomId).maybeSingle()
  if(re||!r){setStatus(re?.message||'ไม่พบห้องที่เลือก');return}
  setRoom(r as Room)
  if(!rent)setRent(String((r as Room).monthly_rent||0))
  const {data:l,error:le}=await supabase.from('leases').select('id,profile_id,start_date,end_date,rent_amount,deposit_amount,status').eq('room_id',roomId).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(le){setStatus(le.message);return}
  if(l){
   setActiveLease(l as LeaseRow)
   const {data:p}=await supabase.from('profiles').select('id,full_name,phone').eq('id',(l as LeaseRow).profile_id).maybeSingle()
   setActiveTenant((p as ProfileRow)||null)
  }
 }

 useEffect(()=>{void load()},[roomId])

 const submit=async(e:FormEvent)=>{
  e.preventDefault()
  if(!roomId){setStatus('เลือกห้องด้านบนก่อน');return}
  if(!fullName.trim()){setStatus('กรอกชื่อผู้เช่า');return}
  setBusy(true);setStatus('กำลังผูกผู้เช่ากับห้อง...')
  const {error}=await supabase.rpc('owner_assign_tenant_to_room',{
   p_room_id:roomId,
   p_full_name:fullName.trim(),
   p_phone:phone.trim()||null,
   p_start_date:startDate,
   p_end_date:endDate||null,
   p_rent_amount:Number(rent||0),
   p_deposit_amount:Number(deposit||0)
  })
  if(error){
   const msg=error.message.includes('ROOM_ALREADY_HAS_ACTIVE_LEASE')?'ห้องนี้มีผู้เช่าหลักที่กำลังใช้งานอยู่แล้ว':error.message
   setStatus(`บันทึกไม่สำเร็จ: ${msg}`);setBusy(false);return
  }
  setStatus('บันทึกสำเร็จ ผูกผู้เช่ากับห้องนี้แล้ว')
  setFullName('');setPhone('')
  await load();setBusy(false)
 }

 if(!roomId)return <section className="section card"><h2>👤 ผูกผู้เช่าเข้าห้อง</h2><p className="muted">เลือกห้องด้านบนก่อน แล้วฟอร์มนี้จะผูกผู้เช่ากับห้องนั้นโดยตรง</p></section>

 return <section className="section card">
  <div className="toolbar"><div><h2>👤 ผู้เช่าหลักของห้อง {room?.room_no||''}</h2><p className="muted">ใช้ห้องที่เลือกด้านบนเป็นปลายทาง ไม่ต้องเลือกห้องซ้ำ</p></div><span className="pill">room_id ผูกแล้ว</span></div>

  {activeLease?<div className="noticeBox card section"><strong>มีผู้เช่าหลักแล้ว: {activeTenant?.full_name||'ผู้เช่า'}</strong><p className="muted">โทร {activeTenant?.phone||'—'} · เริ่ม {activeLease.start_date} · ค่าเช่า {Number(activeLease.rent_amount).toLocaleString('th-TH')} บาท</p><p className="muted">ถ้าจะเปลี่ยนผู้เช่า ต้องปิดสัญญาเดิมก่อน ระบบไม่สร้าง active lease ซ้อนห้องเดียวกัน</p></div>:
  <form onSubmit={submit} className="section">
   <div className="formGrid">
    <label>ชื่อผู้เช่า<input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="ชื่อ-นามสกุล" required/></label>
    <label>เบอร์โทร<input value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" placeholder="08xxxxxxxx"/></label>
    <label>วันเข้าอยู่<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} required/></label>
    <label>วันสิ้นสุดสัญญา<input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></label>
    <label>ค่าเช่า/เดือน<input type="number" min="0" step="0.01" value={rent} onChange={e=>setRent(e.target.value)} required/></label>
    <label>เงินประกัน<input type="number" min="0" step="0.01" value={deposit} onChange={e=>setDeposit(e.target.value)} required/></label>
   </div>
   <div className="toolbar section"><p className="muted">กดครั้งเดียว ระบบสร้างผู้เช่า + active lease ของห้อง {room?.room_no||''}</p><button className="btn" disabled={busy}>{busy?'กำลังบันทึก...':'บันทึกและผูกเข้าห้องนี้'}</button></div>
  </form>}
  {status&&<div className="noticeBox card section"><strong>สถานะ</strong><p className="muted">{status}</p></div>}
 </section>
}
