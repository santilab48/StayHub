'use client'

import {useEffect,useMemo,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type Room={id:string;room_no:string;floor:string|null}
type Meter={id:string;meter_type:string;previous_value:number|null;confirmed_value:number;unit_rate:number;reading_date:string}
type Lease={id:string;profile_id:string;rent_amount:number;deposit_amount:number}
type Profile={full_name:string|null;phone:string|null;line_user_id:string|null}
type Charges={rent:number;waterRate:number;electricRate:number;internetFee:number;parkingFee:number;otherFee:number}
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
 const [waterCurrent,setWaterCurrent]=useState('0'),[electricCurrent,setElectricCurrent]=useState('0')
 const [flatWater,setFlatWater]=useState(false),[flatWaterAmount,setFlatWaterAmount]=useState('0')
 const [charges,setCharges]=useState<Charges>({rent:0,waterRate:0,electricRate:0,internetFee:0,parkingFee:0,otherFee:0})
 const [issuerName,setIssuerName]=useState(''),[issuerAddress,setIssuerAddress]=useState(''),[templateId,setTemplateId]=useState('')
 const [status,setStatus]=useState('กำลังตรวจสิทธิ์...'),[meterStatus,setMeterStatus]=useState(''),[billStatus,setBillStatus]=useState('')
 const [savingMeter,setSavingMeter]=useState(false),[savingBill,setSavingBill]=useState(false),[savingHeader,setSavingHeader]=useState(false)

 useEffect(()=>{(async()=>{
  const {data:{user}}=await supabase.auth.getUser(); if(!user){setStatus('กรุณาเข้าสู่ระบบหลังบ้าน');return}
  const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
  if(!profile||!['owner','admin','staff'].includes(profile.role)){setStatus('ไม่มีสิทธิ์ทำบิล');return}
  setTenantId(profile.tenant_id)
  const [{data:roomRows},{data:settings},{data:template}]=await Promise.all([
   supabase.from('rooms').select('id,room_no,floor').eq('tenant_id',profile.tenant_id).eq('is_enabled',true).order('room_no'),
   supabase.from('tenant_settings').select('water_rate,electric_rate,internet_fee,parking_fee').eq('tenant_id',profile.tenant_id).maybeSingle(),
   supabase.from('tenant_bill_templates').select('id,issuer_name,issuer_address').eq('tenant_id',profile.tenant_id).eq('is_default',true).order('created_at',{ascending:false}).limit(1).maybeSingle()
  ])
  setRooms(roomRows||[])
  const wanted=contextRoomId&&(roomRows||[]).some((r:any)=>r.id===contextRoomId)?contextRoomId:(roomRows?.[0]?.id||'')
  setRoomId(wanted)
  setCharges(v=>({...v,waterRate:Number(settings?.water_rate||0),electricRate:Number(settings?.electric_rate||0),internetFee:Number(settings?.internet_fee||0),parkingFee:Number(settings?.parking_fee||0)}))
  if(template){setTemplateId(template.id);setIssuerName(template.issuer_name||'');setIssuerAddress(template.issuer_address||'')}
  setStatus('พร้อมทำบิล')
 })()},[supabase,contextRoomId])

 useEffect(()=>{if(!tenantId||!roomId)return;(async()=>{
  setBillStatus('กำลังดึงข้อมูลห้อง...')
  const [{data:l},{data:override},{data:meters}]=await Promise.all([
   supabase.from('leases').select('id,profile_id,rent_amount,deposit_amount').eq('tenant_id',tenantId).eq('room_id',roomId).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle(),
   supabase.from('room_billing_overrides').select('water_rate,electric_rate,internet_fee,parking_fee').eq('tenant_id',tenantId).eq('room_id',roomId).eq('active',true).maybeSingle(),
   supabase.from('meter_readings').select('id,meter_type,previous_value,confirmed_value,unit_rate,reading_date').eq('tenant_id',tenantId).eq('room_id',roomId).order('reading_date',{ascending:false}).order('created_at',{ascending:false})
  ])
  setLease(l as Lease|null)
  let p:Profile|null=null
  if(l?.profile_id){const {data:pr}=await supabase.from('profiles').select('full_name,phone,line_user_id').eq('id',l.profile_id).maybeSingle();p=pr as Profile|null}
  setResident(p)
  const latest=(type:string)=>(meters||[]).find((m:any)=>m.meter_type===type)||null
  const w=latest('water') as Meter|null,e=latest('electric') as Meter|null
  setWater(w);setElectric(e);setWaterCurrent(String(w?.confirmed_value??0));setElectricCurrent(String(e?.confirmed_value??0))
  setCharges(v=>({...v,rent:Number(l?.rent_amount||0),waterRate:Number(override?.water_rate??w?.unit_rate??v.waterRate),electricRate:Number(override?.electric_rate??e?.unit_rate??v.electricRate),internetFee:Number(override?.internet_fee??v.internetFee),parkingFee:Number(override?.parking_fee??v.parkingFee)}))
  setBillStatus(l?'ดึงข้อมูลผู้เช่าและค่าเช่าแล้ว':'ห้องนี้ยังไม่มี active lease')
 })()},[tenantId,roomId,supabase])

 const previousWater=Number(water?.confirmed_value??0),previousElectric=Number(electric?.confirmed_value??0)
 const currentWater=Number(waterCurrent||0),currentElectric=Number(electricCurrent||0)
 const waterUnits=Math.max(0,currentWater-previousWater),electricUnits=Math.max(0,currentElectric-previousElectric)
 const waterAmount=flatWater?Number(flatWaterAmount||0):waterUnits*charges.waterRate
 const electricAmount=electricUnits*charges.electricRate
 const selectedRoom=rooms.find(r=>r.id===roomId)
 const invoiceNo=selectedRoom?`SH-${period.replace(/-/g,'')}-${selectedRoom.room_no}`:'—'
 const setCharge=(k:keyof Charges,v:string)=>setCharges(c=>({...c,[k]:Number(v)||0}))

 const items:BillItem[]=useMemo(()=>{
  const x:BillItem[]=[]
  if(charges.rent)x.push({type:'rent',description:'ค่าเช่า',quantity:1,unitPrice:charges.rent,amount:charges.rent})
  if(waterAmount)x.push({type:'water',description:flatWater?'ค่าน้ำ (เหมาจ่าย)':'ค่าน้ำ',quantity:flatWater?1:waterUnits,unitPrice:flatWater?waterAmount:charges.waterRate,amount:waterAmount,sourceId:flatWater?null:water?.id})
  if(electricAmount)x.push({type:'electric',description:'ค่าไฟ',quantity:electricUnits,unitPrice:charges.electricRate,amount:electricAmount,sourceId:electric?.id})
  if(charges.internetFee)x.push({type:'internet',description:'ค่าอินเทอร์เน็ต',quantity:1,unitPrice:charges.internetFee,amount:charges.internetFee})
  if(charges.parkingFee)x.push({type:'parking',description:'ค่าจอดรถ',quantity:1,unitPrice:charges.parkingFee,amount:charges.parkingFee})
  if(charges.otherFee)x.push({type:'other',description:'ค่าใช้จ่ายอื่น',quantity:1,unitPrice:charges.otherFee,amount:charges.otherFee})
  return x
 },[charges,waterAmount,electricAmount,flatWater,waterUnits,electricUnits,water?.id,electric?.id])
 const total=items.reduce((s,x)=>s+x.amount,0)

 const saveHeader=async()=>{if(!tenantId)return;setSavingHeader(true)
  const payload={tenant_id:tenantId,issuer_name:issuerName.trim()||null,issuer_address:issuerAddress.trim()||null,is_default:true,updated_at:new Date().toISOString()}
  const res=templateId?await supabase.from('tenant_bill_templates').update(payload).eq('id',templateId).select('id').single():await supabase.from('tenant_bill_templates').insert({...payload,template_name:'บิลมาตรฐาน',bill_title:'ใบแจ้งค่าใช้จ่าย'}).select('id').single()
  if(res.data?.id)setTemplateId(res.data.id);setSavingHeader(false);setBillStatus(res.error?`บันทึกข้อมูลผู้ออกบิลไม่สำเร็จ: ${res.error.message}`:'บันทึกชื่อและที่อยู่ออกบิลแล้ว')
 }

 const saveMeter=async(type:'water'|'electric')=>{
  if(!tenantId||!roomId)return
  const prev=type==='water'?previousWater:previousElectric,current=type==='water'?currentWater:currentElectric,rate=type==='water'?charges.waterRate:charges.electricRate
  if(current<prev){setMeterStatus(`บันทึกไม่ได้: เลข${type==='water'?'น้ำ':'ไฟ'}ครั้งนี้ห้ามต่ำกว่าครั้งก่อน ${prev}`);return}
  setSavingMeter(true);setMeterStatus('กำลังบันทึกมิเตอร์...')
  const {error}=await supabase.from('meter_readings').insert({tenant_id:tenantId,room_id:roomId,meter_type:type,reading_date:today(),previous_value:prev,confirmed_value:current,unit_rate:rate})
  setSavingMeter(false)
  if(error){setMeterStatus(`บันทึกไม่สำเร็จ: ${error.message}`);return}
  setMeterStatus(`บันทึกมิเตอร์${type==='water'?'น้ำ':'ไฟ'}แล้ว`)
  const {data:m}=await supabase.from('meter_readings').select('id,meter_type,previous_value,confirmed_value,unit_rate,reading_date').eq('tenant_id',tenantId).eq('room_id',roomId).eq('meter_type',type).order('reading_date',{ascending:false}).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(type==='water'){setWater(m as Meter|null);setWaterCurrent(String(m?.confirmed_value??current))}else{setElectric(m as Meter|null);setElectricCurrent(String(m?.confirmed_value??current))}
 }

 const saveBill=async(send:boolean)=>{
  if(!tenantId||!roomId||!lease){setBillStatus('เลือกห้องที่มีผู้เช่า active ก่อน');return}
  if(!period.trim()){setBillStatus('กรอกรอบบิลก่อน');return}
  setSavingBill(true);setBillStatus(send?'กำลังสร้างและส่งบิลไปห้องของฉัน...':'กำลังบันทึกบิล...')
  const lineReady=Boolean(resident?.line_user_id)
  const card={type:'stayhub_invoice_card',title:'ใบแจ้งค่าใช้จ่าย',invoice_no:invoiceNo,issued_at:issuedDate,room:selectedRoom?.room_no||'',resident:resident?.full_name||'',period,due_date:dueDate||null,total,items:items.map(i=>({description:i.description,quantity:i.quantity,unit_price:i.unitPrice,amount:i.amount}))}
  const invoicePayload={tenant_id:tenantId,room_id:roomId,lease_id:lease.id,period:period.trim(),invoice_no:invoiceNo,issued_at:issuedDate,rent_amount:charges.rent,water_amount:waterAmount,electric_amount:electricAmount,other_amount:charges.internetFee+charges.parkingFee+charges.otherFee,total_amount:total,due_date:dueDate||null,status:'unpaid',send_at:sendAt?new Date(sendAt).toISOString():null,scheduled_status:send?(sendAt?'scheduled':(lineReady?'queued':'draft')):'draft',resident_name:resident?.full_name||null,resident_phone:resident?.phone||null,issuer_name:issuerName.trim()||null,issuer_address:issuerAddress.trim()||null,water_billing_mode:flatWater?'flat':'meter',water_flat_amount:flatWater?Number(flatWaterAmount||0):0,water_previous_value:previousWater,water_current_value:currentWater,electric_previous_value:previousElectric,electric_current_value:currentElectric,line_card_payload:card,line_delivery_status:send?(lineReady?'queued':'waiting_line_link'):'not_requested',line_delivery_error:send&&!lineReady?'ผู้เช่ายังไม่มี LINE user ID':null,published_to_room_at:send?new Date().toISOString():null}
  const {data:inv,error:ie}=await supabase.from('invoices').upsert(invoicePayload,{onConflict:'tenant_id,room_id,period'}).select('id').single()
  if(ie||!inv){setSavingBill(false);setBillStatus(`บันทึกบิลไม่สำเร็จ: ${ie?.message||'ไม่พบ invoice id'}`);return}
  await supabase.from('invoice_items').delete().eq('invoice_id',inv.id)
  if(items.length){const {error:itemError}=await supabase.from('invoice_items').insert(items.map(i=>({tenant_id:tenantId,invoice_id:inv.id,item_type:i.type,description:i.description,quantity:i.quantity,unit_price:i.unitPrice,amount:i.amount,source_id:i.sourceId||null})));if(itemError){setSavingBill(false);setBillStatus(`บันทึกรายการบิลไม่สำเร็จ: ${itemError.message}`);return}}
  setSavingBill(false)
  if(send){setBillStatus(lineReady?'ส่งบิลเข้าห้องของฉันแล้ว + เข้าคิว LINE แล้ว':'ส่งบิลเข้าห้องของฉันแล้ว · LINE จะส่งเพิ่มเมื่อเชื่อมผู้เช่า')}else setBillStatus('บันทึกฉบับร่างแล้ว')
 }

 return <div className="section">
  <section className="card"><div className="toolbar"><div><h2>ทำบิลรายห้อง</h2><p className="muted">เลือกห้องครั้งเดียว แล้วดึงผู้เช่า ค่าเช่า และข้อมูลเดิมของห้องอัตโนมัติ</p></div><span className="pill">{status}</span></div>
   <div className="formGrid"><label>ห้อง<select value={roomId} onChange={e=>setRoomId(e.target.value)} disabled={Boolean(contextRoomId)}><option value="">เลือกห้อง</option>{rooms.map(r=><option value={r.id} key={r.id}>{r.room_no}{r.floor?` · ชั้น ${r.floor}`:''}</option>)}</select></label><label>ผู้เช่า<input value={resident?.full_name||''} readOnly placeholder="ดึงจาก active lease"/></label><label>รอบบิล<input value={period} onChange={e=>setPeriod(e.target.value)} placeholder="2026-08"/></label><label>วันที่ออกบิล<input type="date" value={issuedDate} onChange={e=>setIssuedDate(e.target.value)}/></label><label>วันครบกำหนด<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label></div>
   <p className="muted">{billStatus}</p>
  </section>

  <section className="section card"><div className="toolbar"><div><h3>🏢 ข้อมูลผู้ออกบิล</h3><p className="muted">บันทึกครั้งเดียว ครั้งต่อไประบบดึงขึ้นมาเอง และ snapshot ลงบิลแต่ละใบ</p></div><button type="button" className="btn secondary" onClick={saveHeader} disabled={savingHeader}>{savingHeader?'กำลังบันทึก...':'บันทึกข้อมูลผู้ออกบิล'}</button></div><div className="formGrid"><label>ชื่อที่ออกบิล<input value={issuerName} onChange={e=>setIssuerName(e.target.value)} placeholder="ชื่อหอ / ชื่อผู้ประกอบการ"/></label><label className="span2">ที่อยู่ออกบิล<textarea value={issuerAddress} onChange={e=>setIssuerAddress(e.target.value)} placeholder="ที่อยู่สำหรับแสดงบนบิล"/></label></div></section>

  <section className="section splitGrid">
   <div className="card"><h3>💧 มิเตอร์น้ำ</h3><div className="infoRow"><span className="muted">เลขครั้งก่อน</span><strong>{previousWater}</strong></div><label>เลขครั้งนี้<input type="number" min={previousWater} step="0.01" value={waterCurrent} onChange={e=>setWaterCurrent(e.target.value)}/><small className="muted">ห้ามต่ำกว่า {previousWater}</small></label><label>ราคาต่อหน่วย<input type="number" min="0" step="0.01" value={charges.waterRate} onChange={e=>setCharge('waterRate',e.target.value)} disabled={flatWater}/></label><label className="checkRow"><input type="checkbox" checked={flatWater} onChange={e=>setFlatWater(e.target.checked)}/> ค่าน้ำแบบเหมา</label>{flatWater&&<label>ค่าน้ำเหมา<input type="number" min="0" step="0.01" value={flatWaterAmount} onChange={e=>setFlatWaterAmount(e.target.value)}/></label>}<div className="infoRow"><span>{flatWater?'ค่าน้ำเหมา':`ใช้ ${waterUnits} หน่วย`}</span><strong>{waterAmount.toLocaleString()} บาท</strong></div><button type="button" className="btn" disabled={savingMeter||currentWater<previousWater} onClick={()=>saveMeter('water')}>{savingMeter?'กำลังบันทึก...':'บันทึกมิเตอร์น้ำ'}</button></div>
   <div className="card"><h3>⚡ มิเตอร์ไฟ</h3><div className="infoRow"><span className="muted">เลขครั้งก่อน</span><strong>{previousElectric}</strong></div><label>เลขครั้งนี้<input type="number" min={previousElectric} step="0.01" value={electricCurrent} onChange={e=>setElectricCurrent(e.target.value)}/><small className="muted">ห้ามต่ำกว่า {previousElectric}</small></label><label>ราคาต่อหน่วย<input type="number" min="0" step="0.01" value={charges.electricRate} onChange={e=>setCharge('electricRate',e.target.value)}/></label><div className="infoRow"><span>ใช้ {electricUnits} หน่วย</span><strong>{electricAmount.toLocaleString()} บาท</strong></div><button type="button" className="btn" disabled={savingMeter||currentElectric<previousElectric} onClick={()=>saveMeter('electric')}>{savingMeter?'กำลังบันทึก...':'บันทึกมิเตอร์ไฟ'}</button></div>
  </section>
  {meterStatus&&<div className="noticeBox card section"><strong>สถานะมิเตอร์</strong><p className="muted">{meterStatus}</p></div>}

  <section className="section card"><h3>รายการค่าใช้จ่าย</h3><div className="formGrid"><label>ค่าเช่า<input type="number" min="0" value={charges.rent} onChange={e=>setCharge('rent',e.target.value)}/></label><label>ค่าเน็ต<input type="number" min="0" value={charges.internetFee} onChange={e=>setCharge('internetFee',e.target.value)}/></label><label>ค่าจอดรถ<input type="number" min="0" value={charges.parkingFee} onChange={e=>setCharge('parkingFee',e.target.value)}/></label><label>ค่าใช้จ่ายอื่น<input type="number" min="0" value={charges.otherFee} onChange={e=>setCharge('otherFee',e.target.value)}/></label></div></section>

  <section className="section card" style={{padding:'28px'}}>
   <div className="toolbar" style={{alignItems:'flex-start'}}><div><div className="pill">ใบแจ้งค่าใช้จ่าย</div><h2 style={{marginBottom:4}}>{issuerName||'ชื่อหอ / ผู้ออกบิล'}</h2><p className="muted" style={{whiteSpace:'pre-wrap',marginTop:0}}>{issuerAddress||'ที่อยู่ออกบิล'}</p></div><div style={{textAlign:'right'}}><div><span className="muted">เลขที่บิล</span><br/><strong>{invoiceNo}</strong></div><div style={{marginTop:8}}><span className="muted">วันที่ออกบิล</span><br/><strong>{fmtDate(issuedDate)}</strong></div></div></div>
   <hr/>
   <div className="splitGrid section"><div><span className="muted">เรียกเก็บจาก</span><h3>{resident?.full_name||'ยังไม่มีผู้เช่า'}</h3><p>ห้อง {selectedRoom?.room_no||'—'}{resident?.phone?` · ${resident.phone}`:''}</p></div><div><div className="infoRow"><span>รอบบิล</span><strong>{period||'—'}</strong></div><div className="infoRow"><span>ครบกำหนด</span><strong>{fmtDate(dueDate)}</strong></div></div></div>
   <div className="section"><div className="infoRow"><strong>รายการ</strong><strong>จำนวนเงิน</strong></div>{items.map(i=><div className="infoRow" key={i.type}><span>{i.description}{i.quantity!==1?` · ${i.quantity} × ${i.unitPrice.toLocaleString()}`:''}</span><strong>{i.amount.toLocaleString()} บาท</strong></div>)}</div>
   <div className="section" style={{borderTop:'2px solid currentColor',paddingTop:16}}><div className="toolbar"><strong style={{fontSize:'1.2rem'}}>ยอดรวมทั้งสิ้น</strong><strong style={{fontSize:'2rem'}}>{total.toLocaleString()} บาท</strong></div></div>
  </section>

  <section className="section card"><div className="formGrid"><label>วัน/เวลาส่ง LINE (ถ้าต้องการตั้งเวลา)<input type="datetime-local" value={sendAt} onChange={e=>setSendAt(e.target.value)}/></label></div><div className="flow section"><button type="button" className="btn secondary" disabled={savingBill||!roomId||!lease} onClick={()=>saveBill(false)}>บันทึกฉบับร่าง</button><button type="button" className="btn" disabled={savingBill||!roomId||!lease} onClick={()=>saveBill(true)}>{savingBill?'กำลังส่ง...':'ส่งบิล'}</button></div><p className="muted">กดส่งบิล = ส่งเข้าหน้า “ห้องของฉัน” ทันที และส่ง LINE เพิ่มอีกทางเมื่อผู้เช่าเชื่อม LINE แล้ว</p></section>
 </div>
}
