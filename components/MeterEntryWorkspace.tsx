'use client'

import {useEffect,useMemo,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type Room={id:string;room_no:string;floor:string|null}
type Meter={id:string;meter_type:string;confirmed_value:number;unit_rate:number;reading_date:string;image_path:string|null;detected_value:number|null;ocr_confidence:number|null}

const today=()=>new Date().toISOString().slice(0,10)

export default function MeterEntryWorkspace(){
 const supabase=useMemo(()=>createSupabaseBrowser(),[]),search=useSearchParams()
 const contextRoomId=search.get('room_id')||''
 const [tenantId,setTenantId]=useState(''),[rooms,setRooms]=useState<Room[]>([]),[roomId,setRoomId]=useState(contextRoomId)
 const [water,setWater]=useState<Meter|null>(null),[electric,setElectric]=useState<Meter|null>(null)
 const [waterValue,setWaterValue]=useState('0'),[electricValue,setElectricValue]=useState('0')
 const [waterRate,setWaterRate]=useState('0'),[electricRate,setElectricRate]=useState('0')
 const [status,setStatus]=useState('กำลังโหลด...'),[saving,setSaving]=useState(false)

 useEffect(()=>{(async()=>{
  const {data:{user}}=await supabase.auth.getUser(); if(!user){setStatus('กรุณาเข้าสู่ระบบ');return}
  const {data:p}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
  if(!p||!['owner','admin','staff'].includes(p.role)){setStatus('ไม่มีสิทธิ์บันทึกมิเตอร์');return}
  setTenantId(p.tenant_id)
  const [{data:rs},{data:s}]=await Promise.all([
   supabase.from('rooms').select('id,room_no,floor').eq('tenant_id',p.tenant_id).eq('is_enabled',true).order('room_no'),
   supabase.from('tenant_settings').select('water_rate,electric_rate').eq('tenant_id',p.tenant_id).maybeSingle()
  ])
  setRooms(rs||[]);setWaterRate(String(s?.water_rate||0));setElectricRate(String(s?.electric_rate||0))
  setRoomId(contextRoomId&&(rs||[]).some((r:any)=>r.id===contextRoomId)?contextRoomId:(rs?.[0]?.id||''));setStatus('พร้อมบันทึก')
 })()},[supabase,contextRoomId])

 useEffect(()=>{if(!tenantId||!roomId)return;(async()=>{
  const {data}=await supabase.from('meter_readings').select('id,meter_type,confirmed_value,unit_rate,reading_date,image_path,detected_value,ocr_confidence').eq('tenant_id',tenantId).eq('room_id',roomId).order('reading_date',{ascending:false}).order('created_at',{ascending:false})
  const w=(data||[]).find((x:any)=>x.meter_type==='water')||null,e=(data||[]).find((x:any)=>x.meter_type==='electric')||null
  setWater(w);setElectric(e);setWaterValue(String(w?.confirmed_value??0));setElectricValue(String(e?.confirmed_value??0))
  if(w?.unit_rate!=null)setWaterRate(String(w.unit_rate));if(e?.unit_rate!=null)setElectricRate(String(e.unit_rate))
 })()},[tenantId,roomId,supabase])

 const save=async(type:'water'|'electric')=>{
  if(!tenantId||!roomId)return
  const old=type==='water'?Number(water?.confirmed_value||0):Number(electric?.confirmed_value||0)
  const value=Number(type==='water'?waterValue:electricValue),rate=Number(type==='water'?waterRate:electricRate)
  if(!Number.isFinite(value)||value<old){setStatus(`บันทึกไม่ได้: เลขครั้งนี้ห้ามต่ำกว่าครั้งก่อน ${old}`);return}
  setSaving(true);setStatus('กำลังบันทึก...')
  const {error}=await supabase.from('meter_readings').insert({tenant_id:tenantId,room_id:roomId,meter_type:type,reading_date:today(),previous_value:old,confirmed_value:value,unit_rate:rate})
  if(error){setSaving(false);setStatus(`บันทึกไม่สำเร็จ: ${error.message}`);return}
  const {data:m}=await supabase.from('meter_readings').select('id,meter_type,confirmed_value,unit_rate,reading_date,image_path,detected_value,ocr_confidence').eq('tenant_id',tenantId).eq('room_id',roomId).eq('meter_type',type).order('reading_date',{ascending:false}).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(type==='water')setWater(m as Meter|null);else setElectric(m as Meter|null)
  setSaving(false);setStatus(`บันทึกมิเตอร์${type==='water'?'น้ำ':'ไฟ'}แล้ว · หน้าทำบิลจะดึงค่านี้อัตโนมัติ`)
 }

 const scan=(type:'water'|'electric')=>{
  setStatus(`โหมดสแกนมิเตอร์${type==='water'?'น้ำ':'ไฟ'}: เลือก/ถ่ายภาพแล้วให้ตรวจเลขก่อนกดบันทึก (OCR จะเชื่อมในขั้นถัดไป)`)
 }

 const box=(type:'water'|'electric')=>{
  const isWater=type==='water',m=isWater?water:electric,val=isWater?waterValue:electricValue,setVal=isWater?setWaterValue:setElectricValue,rate=isWater?waterRate:electricRate,setRate=isWater?setWaterRate:setElectricRate
  const prev=Number(m?.confirmed_value||0)
  return <div className="card"><h3>{isWater?'💧 มิเตอร์น้ำ':'⚡ มิเตอร์ไฟ'}</h3><div className="infoRow"><span className="muted">เลขครั้งก่อน</span><strong>{prev}</strong></div><label>เลขครั้งนี้<input type="number" min={prev} step="0.01" value={val} onChange={e=>setVal(e.target.value)}/><small className="muted">ห้ามต่ำกว่า {prev}</small></label><label>ราคาต่อหน่วย<input type="number" min="0" step="0.01" value={rate} onChange={e=>setRate(e.target.value)}/></label><div className="flow section"><button type="button" className="btn secondary" onClick={()=>scan(type)}>📷 สแกน/ถ่ายรูป</button><button type="button" className="btn" disabled={saving||Number(val)<prev} onClick={()=>save(type)}>{saving?'กำลังบันทึก...':'บันทึก'}</button></div><p className="muted">กรอกเองได้ทันที หรือใช้ปุ่มสแกนเมื่อเชื่อม OCR แล้ว ค่าสุดท้ายต้องยืนยันก่อนเสมอ</p></div>
 }

 return <div className="section"><section className="card"><div className="toolbar"><div><h2>บันทึกน้ำ / ไฟ</h2><p className="muted">เลือกห้องครั้งเดียว บันทึกค่ามิเตอร์ที่นี่ แล้วหน้าทำบิลดึงไปใช้เอง</p></div><span className="pill">{status}</span></div><label>ห้อง<select value={roomId} onChange={e=>setRoomId(e.target.value)} disabled={Boolean(contextRoomId)}><option value="">เลือกห้อง</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.room_no}{r.floor?` · ชั้น ${r.floor}`:''}</option>)}</select></label></section><section className="section splitGrid">{box('water')}{box('electric')}</section></div>
}
