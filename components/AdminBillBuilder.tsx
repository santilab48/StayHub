'use client'

import {useEffect,useMemo,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type Room={id:string;room_no:string;floor:string|null}
type Meter={id:string;meter_type:string;previous_value:number|null;confirmed_value:number;unit_rate:number;reading_date:string}
type Lease={id:string;profile_id:string;rent_amount:number;deposit_amount:number}
type Profile={full_name:string|null;phone:string|null;line_user_id:string|null}
type Charges={rent:number;internetFee:number;parkingFee:number;otherFee:number}
type BillItem={type:string;description:string;quantity:number;unitPrice:number;amount:number;sourceId?:string|null}

const monthNow=()=>new Date().toISOString().slice(0,7)
const today=()=>new Date().toISOString().slice(0,10)
const fmtDate=(v:string)=>v?new Date(`${v}T00:00:00`).toLocaleDateString('th-TH'):'—'

export default function AdminBillBuilder({slug}:{slug:string}){
 const supabase=useMemo(()=>createSupabaseBrowser(),[]),search=useSearchParams()
 const contextRoomId=search.get('room_id')||''
 const [tenantId,setTenantId]=useState(''),[rooms,setRooms]=useState<Room[]>([]),[roomId,setRoomId]=useState(contextRoomId)
 const [period,setPeriod]=useState(monthNow()),[issuedDate,setIssuedDate]=useState(today()),[dueDate,setDueDate]=useState(''),[sendAt,setSendAt]=useState('')
 const [lease,setLease]=useState<Lease|null>(null),[resident,setResident]=useState<Profile|null>(null)
 const [water,setWater]=useState<Meter|null>(null),[electric,setElectric]=useState<Meter|null>(null)
 const [flatWater,setFlatWater]=useState(false),[flatWaterAmount,setFlatWaterAmount]=useState('0')
 const [charges,setCharges]=useState<Charges>({rent:0,internetFee:0,parkingFee:0,otherFee:0})
 const [issuerName,setIssuerName]=useState(''),[issuerAddress,setIssuerAddress]=useState(''),[templateId,setTemplateId]=useState('')
 const [status,setStatus]=useState('กำลังตรวจสิทธิ์...'),[billStatus,setBillStatus]=useState('')
 const [savingBill,setSavingBill]=useState(false),[savingHeader,setSavingHeader]=useState(false)

 useEffect(()=>{(async()=>{
  const {data:{user}}=await supabase.auth.getUser();if(!user){setStatus('กรุณาเข้าสู่ระบบหลังบ้าน');return}
  const {data:p}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
  if(!p||!['owner','admin','staff'].includes(p.role)){setStatus('ไม่มีสิทธิ์ทำบิล');return}
  setTenantId(p.tenant_id)
  const [{data:rs},{data:s},{data:t}]=await Promise.all([
   supabase.from('rooms').select('id,room_no,floor').eq('tenant_id',p.tenant_id).eq('is_enabled',true).order('room_no'),
   supabase.from('tenant_settings').select('internet_fee,parking_fee').eq('tenant_id',p.tenant_id).maybeSingle(),
   supabase.from('tenant_bill_templates').select('id,issuer_name,issuer_address').eq('tenant_id',p.tenant_id).eq('is_default',true).order('created_at',{ascending:false}).limit(1).maybeSingle()
  ])
  setRooms(rs||[]);setRoomId(contextRoomId&&(rs||[]).some((r:any)=>r.id===contextRoomId)?contextRoomId:(rs?.[0]?.id||''))
  setCharges(v=>({...v,internetFee:Number(s?.internet_fee||0),parkingFee:Number(s?.parking_fee||0)}))
  if(t){setTemplateId(t.id);setIssuerName(t.issuer_name||'');setIssuerAddress(t.issuer_address||'')}
  setStatus('พร้อมทำบิล')
 })()},[supabase,contextRoomId])

 useEffect(()=>{if(!tenantId||!roomId)return;(async()=>{
  setBillStatus('กำลังดึงผู้เช่าและมิเตอร์ที่บันทึกไว้...')
  const [{data:l},{data:o},{data:meters}]=await Promise.all([
   supabase.from('leases').select('id,profile_id,rent_amount,deposit_amount').eq('tenant_id',tenantId).eq('room_id',roomId).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle(),
   supabase.from('room_billing_overrides').select('internet_fee,parking_fee').eq('tenant_id',tenantId).eq('room_id',roomId).eq('active',true).maybeSingle(),
   supabase.from('meter_readings').select('id,meter_type,previous_value,confirmed_value,unit_rate,reading_date').eq('tenant_id',tenantId).eq('room_id',roomId).order('reading_date',{ascending:false}).order('created_at',{ascending:false})
  ])
  setLease(l as Lease|null)
  let pr:Profile|null=null;if(l?.profile_id){const {data}=await supabase.from('profiles').select('full_name,phone,line_user_id').eq('id',l.profile_id).maybeSingle();pr=data as Profile|null}setResident(pr)
  setWater(((meters||[]).find((m:any)=>m.meter_type==='water')||null) as Meter|null)
  setElectric(((meters||[]).find((m:any)=>m.meter_type==='electric')||null) as Meter|null)
  setCharges(v=>({...v,rent:Number(l?.rent_amount||0),internetFee:Number(o?.internet_fee??v.internetFee),parkingFee:Number(o?.parking_fee??v.parkingFee)}))
  setBillStatus(l?'ดึงข้อมูลห้องและค่ามิเตอร์ล่าสุดแล้ว':'ห้องนี้ยังไม่มี active lease')
 })()},[tenantId,roomId,supabase])

 const previousWater=Number(water?.previous_value??water?.confirmed_value??0),currentWater=Number(water?.confirmed_value??0)
 const previousElectric=Number(electric?.previous_value??electric?.confirmed_value??0),currentElectric=Number(electric?.confirmed_value??0)
 const waterUnits=Math.max(0,currentWater-previousWater),electricUnits=Math.max(0,currentElectric-previousElectric)
 const waterRate=Number(water?.unit_rate||0),electricRate=Number(electric?.unit_rate||0)
 const waterAmount=flatWater?Number(flatWaterAmount||0):waterUnits*waterRate
 const electricAmount=electricUnits*electricRate
 const selectedRoom=rooms.find(r=>r.id===roomId),invoiceNo=selectedRoom?`SH-${period.replace(/-/g,'')}-${selectedRoom.room_no}`:'—'
 const setCharge=(k:keyof Charges,v:string)=>setCharges(c=>({...c,[k]:Number(v)||0}))

 const items:BillItem[]=useMemo(()=>{
  const x:BillItem[]=[]
  if(charges.rent)x.push({type:'rent',description:'ค่าเช่า',quantity:1,unitPrice:charges.rent,amount:charges.rent})
  if(waterAmount)x.push({type:'water',description:flatWater?'ค่าน้ำ (เหมาจ่าย)':'ค่าน้ำ',quantity:flatWater?1:waterUnits,unitPrice:flatWater?waterAmount:waterRate,amount:waterAmount,sourceId:flatWater?null:water?.id})
  if(electricAmount)x.push({type:'electric',description:'ค่าไฟ',quantity:electricUnits,unitPrice:electricRate,amount:electricAmount,sourceId:electric?.id})
  if(charges.internetFee)x.push({type:'internet',description:'ค่าอินเทอร์เน็ต',quantity:1,unitPrice:charges.internetFee,amount:charges.internetFee})
  if(charges.parkingFee)x.push({type:'parking',description:'ค่าจอดรถ',quantity:1,unitPrice:charges.parkingFee,amount:charges.parkingFee})
  if(charges.otherFee)x.push({type:'other',description:'ค่าใช้จ่ายอื่น',quantity:1,unitPrice:charges.otherFee,amount:charges.otherFee})
  return x
 },[charges,waterAmount,electricAmount,flatWater,waterUnits,electricUnits,waterRate,electricRate,water?.id,electric?.id])
 const total=items.reduce((s,x)=>s+x.amount,0)

 const saveHeader=async()=>{if(!tenantId)return;setSavingHeader(true);const payload={tenant_id:tenantId,issuer_name:issuerName.trim()||null,issuer_address:issuerAddress.trim()||null,is_default:true,updated_at:new Date().toISOString()};const res=templateId?await supabase.from('tenant_bill_templates').update(payload).eq('id',templateId).select('id').single():await supabase.from('tenant_bill_templates').insert({...payload,template_name:'บิลมาตรฐาน',bill_title:'ใบแจ้งค่าใช้จ่าย'}).select('id').single();if(res.data?.id)setTemplateId(res.data.id);setSavingHeader(false);setBillStatus(res.error?`บันทึกข้อมูลผู้ออกบิลไม่สำเร็จ: ${res.error.message}`:'บันทึกข้อมูลผู้ออกบิลแล้ว')}

 const saveBill=async(send:boolean)=>{
  if(!tenantId||!roomId||!lease){setBillStatus('เลือกห้องที่มีผู้เช่า active ก่อน');return}
  setSavingBill(true);const lineReady=Boolean(resident?.line_user_id)
  const card={type:'stayhub_invoice_card',title:'ใบแจ้งค่าใช้จ่าย',invoice_no:invoiceNo,issued_at:issuedDate,room:selectedRoom?.room_no||'',resident:resident?.full_name||'',period,due_date:dueDate||null,total,items:items.map(i=>({description:i.description,quantity:i.quantity,unit_price:i.unitPrice,amount:i.amount}))}
  const payload={tenant_id:tenantId,room_id:roomId,lease_id:lease.id,period,invoice_no:invoiceNo,issued_at:issuedDate,rent_amount:charges.rent,water_amount:waterAmount,electric_amount:electricAmount,other_amount:charges.internetFee+charges.parkingFee+charges.otherFee,total_amount:total,due_date:dueDate||null,status:'unpaid',send_at:sendAt?new Date(sendAt).toISOString():null,scheduled_status:send?(sendAt?'scheduled':(lineReady?'queued':'draft')):'draft',resident_name:resident?.full_name||null,resident_phone:resident?.phone||null,issuer_name:issuerName.trim()||null,issuer_address:issuerAddress.trim()||null,water_billing_mode:flatWater?'flat':'meter',water_flat_amount:flatWater?Number(flatWaterAmount||0):0,water_previous_value:previousWater,water_current_value:currentWater,electric_previous_value:previousElectric,electric_current_value:currentElectric,line_card_payload:card,line_delivery_status:send?(lineReady?'queued':'waiting_line_link'):'not_requested',line_delivery_error:send&&!lineReady?'ผู้เช่ายังไม่มี LINE user ID':null,published_to_room_at:send?new Date().toISOString():null}
  const {data:inv,error}=await supabase.from('invoices').upsert(payload,{onConflict:'tenant_id,room_id,period'}).select('id').single();if(error||!inv){setSavingBill(false);setBillStatus(`บันทึกบิลไม่สำเร็จ: ${error?.message||'ไม่พบ invoice id'}`);return}
  await supabase.from('invoice_items').delete().eq('invoice_id',inv.id);if(items.length){const {error:e}=await supabase.from('invoice_items').insert(items.map(i=>({tenant_id:tenantId,invoice_id:inv.id,item_type:i.type,description:i.description,quantity:i.quantity,unit_price:i.unitPrice,amount:i.amount,source_id:i.sourceId||null})));if(e){setSavingBill(false);setBillStatus(`บันทึกรายการบิลไม่สำเร็จ: ${e.message}`);return}}
  setSavingBill(false);setBillStatus(send?(lineReady?'ส่งเข้าห้องของฉันแล้ว + เข้าคิว LINE':'ส่งเข้าห้องของฉันแล้ว · LINE รอเชื่อมผู้เช่า'):'บันทึกฉบับร่างแล้ว')
 }

 return <div className="section">
  <section className="card"><div className="toolbar"><div><h2>ทำบิลรายห้อง</h2><p className="muted">หน้าบิลไม่คีย์มิเตอร์ซ้ำ ระบบอ่านค่าที่บันทึกจากแท็บ “บันทึกน้ำ / ไฟ” โดยตรง</p></div><span className="pill">{status}</span></div><div className="formGrid"><label>ห้อง<select value={roomId} onChange={e=>setRoomId(e.target.value)} disabled={Boolean(contextRoomId)}><option value="">เลือกห้อง</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.room_no}{r.floor?` · ชั้น ${r.floor}`:''}</option>)}</select></label><label>ผู้เช่า<input value={resident?.full_name||''} readOnly/></label><label>รอบบิล<input value={period} onChange={e=>setPeriod(e.target.value)}/></label><label>วันที่ออกบิล<input type="date" value={issuedDate} onChange={e=>setIssuedDate(e.target.value)}/></label><label>วันครบกำหนด<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label></div><p className="muted">{billStatus}</p></section>

  <section className="section card"><div className="toolbar"><div><h3>ค่ามิเตอร์ที่ดึงมาอัตโนมัติ</h3><p className="muted">แก้เลขมิเตอร์ให้ไปที่แท็บ “บันทึกน้ำ / ไฟ” เท่านั้น</p></div><a className="btn secondary" href={`/t/${slug}/admin/meters${roomId?`?room_id=${roomId}`:''}`}>ไปบันทึกน้ำ / ไฟ</a></div><div className="splitGrid"><div><div className="infoRow"><span>น้ำ</span><strong>{previousWater} → {currentWater}</strong></div><div className="infoRow"><span>ใช้</span><strong>{waterUnits} หน่วย × {waterRate}</strong></div></div><div><div className="infoRow"><span>ไฟ</span><strong>{previousElectric} → {currentElectric}</strong></div><div className="infoRow"><span>ใช้</span><strong>{electricUnits} หน่วย × {electricRate}</strong></div></div></div><label className="checkRow"><input type="checkbox" checked={flatWater} onChange={e=>setFlatWater(e.target.checked)}/> ค่าน้ำแบบเหมา</label>{flatWater&&<label>ยอดค่าน้ำเหมา<input type="number" min="0" value={flatWaterAmount} onChange={e=>setFlatWaterAmount(e.target.value)}/></label>}</section>

  <section className="section card"><div className="toolbar"><div><h3>ข้อมูลผู้ออกบิล</h3></div><button className="btn secondary" type="button" onClick={saveHeader} disabled={savingHeader}>{savingHeader?'กำลังบันทึก...':'บันทึกข้อมูลผู้ออกบิล'}</button></div><div className="formGrid"><label>ชื่อที่ออกบิล<input value={issuerName} onChange={e=>setIssuerName(e.target.value)}/></label><label className="span2">ที่อยู่ออกบิล<textarea value={issuerAddress} onChange={e=>setIssuerAddress(e.target.value)}/></label></div></section>

  <section className="section card"><h3>รายการค่าใช้จ่าย</h3><div className="formGrid"><label>ค่าเช่า<input type="number" min="0" value={charges.rent} onChange={e=>setCharge('rent',e.target.value)}/></label><label>ค่าเน็ต<input type="number" min="0" value={charges.internetFee} onChange={e=>setCharge('internetFee',e.target.value)}/></label><label>ค่าจอดรถ<input type="number" min="0" value={charges.parkingFee} onChange={e=>setCharge('parkingFee',e.target.value)}/></label><label>ค่าใช้จ่ายอื่น<input type="number" min="0" value={charges.otherFee} onChange={e=>setCharge('otherFee',e.target.value)}/></label></div></section>

  <section className="section card" style={{padding:'28px'}}><div className="toolbar" style={{alignItems:'flex-start'}}><div><div className="pill">ใบแจ้งค่าใช้จ่าย</div><h2>{issuerName||'ชื่อหอ / ผู้ออกบิล'}</h2><p className="muted" style={{whiteSpace:'pre-wrap'}}>{issuerAddress||'ที่อยู่ออกบิล'}</p></div><div style={{textAlign:'right'}}><span className="muted">เลขที่บิล</span><br/><strong>{invoiceNo}</strong><br/><span className="muted">วันที่ออกบิล</span><br/><strong>{fmtDate(issuedDate)}</strong></div></div><hr/><div className="splitGrid section"><div><span className="muted">เรียกเก็บจาก</span><h3>{resident?.full_name||'ยังไม่มีผู้เช่า'}</h3><p>ห้อง {selectedRoom?.room_no||'—'}</p></div><div><div className="infoRow"><span>รอบบิล</span><strong>{period}</strong></div><div className="infoRow"><span>ครบกำหนด</span><strong>{fmtDate(dueDate)}</strong></div></div></div><div className="section">{items.map(i=><div className="infoRow" key={i.type}><span>{i.description}{i.quantity!==1?` · ${i.quantity} × ${i.unitPrice.toLocaleString()}`:''}</span><strong>{i.amount.toLocaleString()} บาท</strong></div>)}</div><div className="section" style={{borderTop:'2px solid currentColor',paddingTop:16}}><div className="toolbar"><strong>ยอดรวมทั้งสิ้น</strong><strong style={{fontSize:'2rem'}}>{total.toLocaleString()} บาท</strong></div></div></section>

  <section className="section card"><label>วัน/เวลาส่ง LINE (ถ้าต้องการตั้งเวลา)<input type="datetime-local" value={sendAt} onChange={e=>setSendAt(e.target.value)}/></label><div className="flow section"><button type="button" className="btn secondary" disabled={savingBill||!lease} onClick={()=>saveBill(false)}>บันทึกฉบับร่าง</button><button type="button" className="btn" disabled={savingBill||!lease} onClick={()=>saveBill(true)}>{savingBill?'กำลังส่ง...':'ส่งบิล'}</button></div></section>
 </div>
}
