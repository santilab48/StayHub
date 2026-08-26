'use client'

import { FormEvent,useEffect,useMemo,useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

type Room={id:string;room_no:string}
type Rates={water_rate:number;electric_rate:number;internet_fee:number;parking_fee:number}
const blank:Rates={water_rate:0,electric_rate:0,internet_fee:0,parking_fee:0}

export default function FinanceRateSettings(){
 const supabase=useMemo(()=>createSupabaseBrowser(),[])
 const [tenantId,setTenantId]=useState(''); const [rooms,setRooms]=useState<Room[]>([]); const [roomId,setRoomId]=useState('')
 const [defaults,setDefaults]=useState<Rates>(blank); const [override,setOverride]=useState<Rates>(blank); const [status,setStatus]=useState('กำลังตรวจสิทธิ์...')
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setStatus('รอเชื่อมบัญชีเจ้าของ');return}const {data:p}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).single();if(!p||!['owner','admin','staff'].includes(p.role)){setStatus('ไม่มีสิทธิ์');return}setTenantId(p.tenant_id);const [{data:s},{data:r}]=await Promise.all([supabase.from('tenant_settings').select('water_rate,electric_rate,internet_fee,parking_fee').eq('tenant_id',p.tenant_id).maybeSingle(),supabase.from('rooms').select('id,room_no').eq('tenant_id',p.tenant_id).order('room_no')]);setDefaults({...blank,...s});setRooms(r||[]);if(r?.[0])setRoomId(r[0].id);setStatus('พร้อมตั้งราคา')})()},[supabase])
 useEffect(()=>{if(!tenantId||!roomId)return;(async()=>{const {data}=await supabase.from('room_billing_overrides').select('water_rate,electric_rate,internet_fee,parking_fee').eq('tenant_id',tenantId).eq('room_id',roomId).maybeSingle();setOverride({water_rate:Number(data?.water_rate??defaults.water_rate),electric_rate:Number(data?.electric_rate??defaults.electric_rate),internet_fee:Number(data?.internet_fee??defaults.internet_fee),parking_fee:Number(data?.parking_fee??defaults.parking_fee)})})()},[tenantId,roomId,defaults,supabase])
 const set=(target:'d'|'o',k:keyof Rates,v:string)=>target==='d'?setDefaults(x=>({...x,[k]:Number(v)||0})):setOverride(x=>({...x,[k]:Number(v)||0}))
 const saveDefaults=async(e:FormEvent)=>{e.preventDefault();if(!tenantId)return;const {error}=await supabase.from('tenant_settings').upsert({tenant_id:tenantId,...defaults,updated_at:new Date().toISOString()},{onConflict:'tenant_id'});setStatus(error?error.message:'บันทึกราคาเริ่มต้นแล้ว')}
 const saveOverride=async(e:FormEvent)=>{e.preventDefault();if(!tenantId||!roomId)return;const {error}=await supabase.from('room_billing_overrides').upsert({tenant_id:tenantId,room_id:roomId,...override,active:true,updated_at:new Date().toISOString()},{onConflict:'tenant_id,room_id'});setStatus(error?error.message:'บันทึกราคาเฉพาะห้องแล้ว')}
 const fields=(r:Rates,target:'d'|'o')=><div className="formGrid"><label>ค่าน้ำ / หน่วย<input type="number" value={r.water_rate} onChange={e=>set(target,'water_rate',e.target.value)}/></label><label>ค่าไฟ / หน่วย<input type="number" value={r.electric_rate} onChange={e=>set(target,'electric_rate',e.target.value)}/></label><label>ค่าเน็ต / เดือน<input type="number" value={r.internet_fee} onChange={e=>set(target,'internet_fee',e.target.value)}/></label><label>ค่าจอดรถ / เดือน<input type="number" value={r.parking_fee} onChange={e=>set(target,'parking_fee',e.target.value)}/></label></div>
 return <div className="section"><div className="toolbar"><div><h2>ตั้งราคาค่าใช้จ่าย</h2><p className="muted">ตั้งค่าเริ่มต้นทั้งหอ แล้วกำหนดราคาเฉพาะห้องทับได้</p></div><span className="pill">{status}</span></div><form onSubmit={saveDefaults} className="card section"><h3>ราคาเริ่มต้นทั้งหอ</h3>{fields(defaults,'d')}<button className="btn section">บันทึกราคาเริ่มต้น</button></form><form onSubmit={saveOverride} className="card section"><h3>ราคาเฉพาะห้อง</h3><label>เลือกห้อง<select value={roomId} onChange={e=>setRoomId(e.target.value)}>{rooms.map(r=><option value={r.id} key={r.id}>{r.room_no}</option>)}</select></label>{fields(override,'o')}<button className="btn section">บันทึกราคาห้องนี้</button></form></div>
}
