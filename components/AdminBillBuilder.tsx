'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

type Room={id:string;room_no:string;floor:string|null}
type Meter={id:string;meter_type:string;previous_value:number;confirmed_value:number;unit_rate:number;reading_date:string}

type Charges={rent:number;waterRate:number;electricRate:number;internetFee:number;parkingFee:number;otherFee:number}

export default function AdminBillBuilder(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [tenantId,setTenantId]=useState('')
  const [rooms,setRooms]=useState<Room[]>([])
  const [roomId,setRoomId]=useState('')
  const [period,setPeriod]=useState('')
  const [dueDate,setDueDate]=useState('')
  const [sendAt,setSendAt]=useState('')
  const [water,setWater]=useState<Meter|null>(null)
  const [electric,setElectric]=useState<Meter|null>(null)
  const [charges,setCharges]=useState<Charges>({rent:0,waterRate:0,electricRate:0,internetFee:0,parkingFee:0,otherFee:0})
  const [status,setStatus]=useState('กำลังตรวจสิทธิ์...')

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('รอเชื่อมบัญชีเจ้าของ');return}
    const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).single()
    if(!profile||!['owner','admin','staff'].includes(profile.role)){setStatus('ไม่มีสิทธิ์ทำบิล');return}
    setTenantId(profile.tenant_id)
    const [{data:roomRows},{data:settings}]=await Promise.all([
      supabase.from('rooms').select('id,room_no,floor').eq('tenant_id',profile.tenant_id).order('room_no'),
      supabase.from('tenant_settings').select('water_rate,electric_rate,internet_fee,parking_fee').eq('tenant_id',profile.tenant_id).maybeSingle()
    ])
    setRooms(roomRows||[])
    if(roomRows?.[0])setRoomId(roomRows[0].id)
    setCharges(v=>({...v,waterRate:Number(settings?.water_rate||0),electricRate:Number(settings?.electric_rate||0),internetFee:Number(settings?.internet_fee||0),parkingFee:Number(settings?.parking_fee||0)}))
    setStatus('พร้อมทำบิล')
  })()},[supabase])

  useEffect(()=>{if(!tenantId||!roomId)return;(async()=>{
    const [{data:lease},{data:override},{data:meters}]=await Promise.all([
      supabase.from('leases').select('rent_amount').eq('tenant_id',tenantId).eq('room_id',roomId).eq('status','active').maybeSingle(),
      supabase.from('room_billing_overrides').select('water_rate,electric_rate,internet_fee,parking_fee').eq('tenant_id',tenantId).eq('room_id',roomId).eq('active',true).maybeSingle(),
      supabase.from('meter_readings').select('id,meter_type,previous_value,confirmed_value,unit_rate,reading_date').eq('tenant_id',tenantId).eq('room_id',roomId).not('confirmed_value','is',null).order('reading_date',{ascending:false})
    ])
    const latest=(type:string)=>(meters||[]).find((m:any)=>m.meter_type===type)||null
    const w=latest('water'), e=latest('electric')
    setWater(w);setElectric(e)
    setCharges(v=>({...v,
      rent:Number(lease?.rent_amount||0),
      waterRate:Number(override?.water_rate ?? w?.unit_rate ?? v.waterRate),
      electricRate:Number(override?.electric_rate ?? e?.unit_rate ?? v.electricRate),
      internetFee:Number(override?.internet_fee ?? v.internetFee),
      parkingFee:Number(override?.parking_fee ?? v.parkingFee)
    }))
  })()},[tenantId,roomId,supabase])

  const usage=(m:Meter|null)=>m?Math.max(0,Number(m.confirmed_value)-Number(m.previous_value)):0
  const waterAmount=usage(water)*charges.waterRate
  const electricAmount=usage(electric)*charges.electricRate
  const total=charges.rent+waterAmount+electricAmount+charges.internetFee+charges.parkingFee+charges.otherFee
  const setCharge=(k:keyof Charges,v:string)=>setCharges(c=>({...c,[k]:Number(v)||0}))

  return <div className="section">
    <section className="card"><div className="toolbar"><div><h2>ทำบิลรายห้อง</h2><p className="muted">เลือกห้องแล้วระบบดึงค่าเช่า + มิเตอร์ที่ยืนยันล่าสุดมาให้อัตโนมัติ</p></div><span className="pill">{status}</span></div>
      <div className="formGrid"><label>ห้อง<select value={roomId} onChange={e=>setRoomId(e.target.value)}><option value="">เลือกห้อง</option>{rooms.map(r=><option value={r.id} key={r.id}>{r.room_no}{r.floor?` · ชั้น ${r.floor}`:''}</option>)}</select></label><label>รอบบิล<input value={period} onChange={e=>setPeriod(e.target.value)} placeholder="2026-08"/></label><label>วันครบกำหนด<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><label>วัน/เวลาส่ง LINE<input type="datetime-local" value={sendAt} onChange={e=>setSendAt(e.target.value)}/></label></div>
    </section>

    <section className="section splitGrid">
      <div className="card"><h3>มิเตอร์น้ำ · เติมอัตโนมัติ</h3><div className="infoRow"><span className="muted">ครั้งก่อน</span><strong>{water?.previous_value ?? '—'}</strong></div><div className="infoRow"><span className="muted">ครั้งนี้ที่ยืนยันแล้ว</span><strong>{water?.confirmed_value ?? '—'}</strong></div><div className="infoRow"><span className="muted">หน่วยที่ใช้</span><strong>{usage(water)}</strong></div><label>ราคาต่อหน่วย<input type="number" value={charges.waterRate} onChange={e=>setCharge('waterRate',e.target.value)}/></label><div className="infoRow"><span>ค่าน้ำ</span><strong>{waterAmount.toLocaleString()} บาท</strong></div></div>
      <div className="card"><h3>มิเตอร์ไฟ · เติมอัตโนมัติ</h3><div className="infoRow"><span className="muted">ครั้งก่อน</span><strong>{electric?.previous_value ?? '—'}</strong></div><div className="infoRow"><span className="muted">ครั้งนี้ที่ยืนยันแล้ว</span><strong>{electric?.confirmed_value ?? '—'}</strong></div><div className="infoRow"><span className="muted">หน่วยที่ใช้</span><strong>{usage(electric)}</strong></div><label>ราคาต่อหน่วย<input type="number" value={charges.electricRate} onChange={e=>setCharge('electricRate',e.target.value)}/></label><div className="infoRow"><span>ค่าไฟ</span><strong>{electricAmount.toLocaleString()} บาท</strong></div></div>
    </section>

    <section className="section card"><h3>ค่าประจำห้อง</h3><div className="formGrid"><label>ค่าเช่า<input type="number" value={charges.rent} onChange={e=>setCharge('rent',e.target.value)}/></label><label>ค่าเน็ต<input type="number" value={charges.internetFee} onChange={e=>setCharge('internetFee',e.target.value)}/></label><label>ค่าจอดรถ<input type="number" value={charges.parkingFee} onChange={e=>setCharge('parkingFee',e.target.value)}/></label><label>ค่าใช้จ่ายอื่น<input type="number" value={charges.otherFee} onChange={e=>setCharge('otherFee',e.target.value)}/></label></div></section>

    <section className="section card"><div className="toolbar"><div><h3>ยอดรวม</h3><p className="muted">ราคาน้ำ/ไฟ/เน็ต/จอดรถแก้ได้อิสระ และตั้งค่าเฉพาะห้องได้</p></div><strong style={{fontSize:'1.6rem'}}>{total.toLocaleString()} บาท</strong></div><div className="flow section"><button className="btn" disabled={!roomId}>บันทึกฉบับร่าง</button><button className="btn secondary" disabled={!roomId||!sendAt}>บันทึกและตั้งเวลาส่ง</button></div></section>
  </div>
}
