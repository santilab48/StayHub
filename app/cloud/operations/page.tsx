'use client'
import dashboardStyles from '../dashboard.module.css'
import {FormEvent,useCallback,useEffect,useRef,useState} from 'react'
type Property={id:string;name:string;role:string}
type Stay={id:string;property_id:string;unit_id:string;property_name:string;unit_name:string}
type Unit={id:string;name:string}
type Item={id:string;unit_id?:string;title?:string;body?:string;description?:string;pinned?:boolean;carrier?:string;tracking?:string;status?:string;plate?:string;vehicle_type?:string;name?:string;phone?:string;active?:boolean;driver_id?:string;account_id?:string;note?:string;expires_at?:string;created_at?:string;received_at?:string;requested_at?:string}
type Settings={water_rate:string;electric_rate:string;due_day:number;late_fee:string}
type Kind='announcements'|'parcels'|'vehicles'|'drivers'|'rides'|'documents'|'settings'
const labels:Record<Kind,string>={announcements:'ประกาศ',parcels:'พัสดุ',vehicles:'รถของห้อง',drivers:'คนขับ',rides:'เรียกรถ',documents:'เอกสารข้อความ',settings:'ตั้งราคา'}
const kinds=Object.keys(labels) as Kind[]
async function api<T>(path:string,body?:Record<string,unknown>):Promise<T>{
 const res=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined})
 const value=await res.json()
 if(!res.ok)throw Error(({ 'Forbidden':'ไม่มีสิทธิ์ทำรายการ','Please sign in':'กรุณาเข้าสู่ระบบ','Invalid settings':'ตรวจสอบราคาและวันครบกำหนด','Invalid announcement':'กรอกข้อมูลประกาศให้ถูกต้อง','Invalid parcel':'ตรวจสอบห้องและข้อมูลพัสดุ','Invalid vehicle':'ตรวจสอบทะเบียนรถและประเภทรถ','Invalid driver':'ตรวจสอบชื่อและเบอร์โทรคนขับ','Invalid ride request':'ตรวจสอบข้อมูลการเรียกรถ','Invalid document':'ตรวจสอบหัวข้อและห้อง','Module unavailable':'โหลดข้อมูลงานบริการไม่สำเร็จ','Module action unavailable':'บันทึกงานบริการไม่สำเร็จ','Parcel not waiting':'พัสดุไม่ได้อยู่ในสถานะรอรับ','Item conflicts with property or existing record':'ข้อมูลซ้ำหรือไม่ตรงกับที่พัก','Ride state conflict or not found':'สถานะงานเปลี่ยนไปแล้ว กรุณาโหลดใหม่'} as Record<string,string>)[value.error]||value.error||'ไม่สามารถทำรายการได้')
 return value as T
}
export default function OperationsPage(){
 const [kind,setKind]=useState<Kind>('announcements')
 const [properties,setProperties]=useState<Property[]>([])
 const [stays,setStays]=useState<Stay[]>([])
 const [propertyId,setPropertyId]=useState('')
 const [owner,setOwner]=useState(false)
 const [units,setUnits]=useState<Unit[]>([])
 const [items,setItems]=useState<Item[]>([])
 const [drivers,setDrivers]=useState<Item[]>([])
 const [unitId,setUnitId]=useState('')
 const [fields,setFields]=useState<Record<string,string>>({})
 const [pinned,setPinned]=useState(false)
 const [settings,setSettings]=useState<Settings>({water_rate:'0',electric_rate:'0',due_day:5,late_fee:'0'})
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const loadSequence=useRef(0)
 const [loading,setLoading]=useState(false)
 const [readyKey,setReadyKey]=useState('')
 const update=(key:string,value:string)=>setFields(v=>({...v,[key]:value}))
 const load=useCallback(async(p:string,k:Kind)=>{
  const seq=++loadSequence.current
  setReadyKey('')
  if(!p){setItems([]);setOwner(false);setLoading(false);return}
  setLoading(true)
  try{
  const value=await api<{items:Item[];owner:boolean}>('/api/v2/operations?kind='+k+'&propertyId='+encodeURIComponent(p))
  if(seq!==loadSequence.current)return
  setOwner(value.owner);setItems(value.items);setReadyKey(p+':'+k)
  if(k==='settings'&&value.items[0]){
   const s=value.items[0] as unknown as Settings
   setSettings({water_rate:String(s.water_rate),electric_rate:String(s.electric_rate),due_day:Number(s.due_day),late_fee:String(s.late_fee)})
  }else if(k==='settings')setSettings({water_rate:'0',electric_rate:'0',due_day:5,late_fee:'0'})
  }finally{if(seq===loadSequence.current)setLoading(false)}
 },[])
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search)
  const v=params.get('kind')
  if(v&&kinds.includes(v as Kind))setKind(v as Kind)
  let alive=true
  void Promise.all([api<{items:Property[]}>('/api/v2/properties'),api<{items:Stay[]}>('/api/v2/my-stays')])
   .then(([p,s])=>{if(!alive)return
    const managed=p.items.filter(x=>['owner','admin'].includes(x.role))
    setProperties(managed);setStays(s.items)
    setPropertyId(managed[0]?.id||s.items[0]?.property_id||'')
   }).catch(e=>{if(alive)setError(e instanceof Error?e.message:'กรุณาเข้าสู่ระบบ Cloud')})
  return()=>{alive=false}
 },[])
 useEffect(()=>{let active=true;setItems([]);setError('')
  void load(propertyId,kind).catch(e=>{if(active)setError(e instanceof Error?e.message:'โหลดรายการไม่สำเร็จ')})
  if(kind==='rides'&&propertyId){
   void api<{items:Item[]}>('/api/v2/operations?kind=drivers&propertyId='+encodeURIComponent(propertyId))
    .then(r=>{if(active)setDrivers(r.items)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'โหลดคนขับไม่สำเร็จ')})
  }
  return()=>{active=false}
 },[propertyId,kind,load])
 useEffect(()=>{let active=true
  if(!propertyId){setUnits([]);setUnitId('');return}
  const managed=properties.some(p=>p.id===propertyId)
  if(managed){
   void api<{items:Unit[]}>('/api/v2/units?propertyId='+encodeURIComponent(propertyId)).then(r=>{
    if(active){setUnits(r.items);setUnitId(x=>r.items.some(i=>i.id===x)?x:'')}
   }).catch(e=>{if(active)setError(e instanceof Error?e.message:'โหลดห้องไม่สำเร็จ')})
  }else{
   const mine=stays.filter(s=>s.property_id===propertyId).map(s=>({id:s.unit_id,name:s.unit_name}))
   setUnits(mine);setUnitId(mine[0]?.id||'')
  }
  return()=>{active=false}
 },[propertyId,properties,stays])
 async function submit(e:FormEvent){e.preventDefault()
  if(!propertyId||busy||loading||readyKey!==propertyId+':'+kind)return
  let payload:Record<string,unknown>={propertyId}
  const t=(key:string)=>fields[key]?.trim()||''
  if(kind==='announcements')payload={...payload,action:'announcement-add',unitId:unitId||null,title:t('title'),body:t('body'),pinned}
  if(kind==='parcels')payload={...payload,action:'parcel-add',unitId,carrier:t('carrier'),tracking:t('tracking')}
  if(kind==='vehicles')payload={...payload,action:'vehicle-add',unitId,plate:t('plate'),vehicleType:t('vehicleType')}
  if(kind==='drivers')payload={...payload,action:'driver-add',name:t('name'),phone:t('phone'),vehicleType:t('vehicleType')}
  if(kind==='rides')payload={...payload,action:'ride-add',unitId,driverId:fields.driverId||null,note:t('note')}
  if(kind==='documents')payload={...payload,action:'document-add',unitId,title:t('title'),description:t('description')}
  if(kind==='settings')payload={...payload,action:'settings-save',waterRate:Number(settings.water_rate),electricRate:Number(settings.electric_rate),dueDay:Number(settings.due_day),lateFee:Number(settings.late_fee)}
  if(await run(payload)){setFields({});setPinned(false)}
 }
 async function run(payload:Record<string,unknown>){
  if(busy||loading||readyKey!==propertyId+':'+kind)return false
  setBusy(true);setError('');setNotice('')
  try{
   await api('/api/v2/operations',payload)
   await load(propertyId,kind)
   setNotice('บันทึกสำเร็จ');return true
  }catch(e){setError(e instanceof Error?e.message:'บันทึกไม่สำเร็จ');return false}
  finally{setBusy(false)}
 }
 const input=(key:string,label:string,required=true)=><label key={key}>{label}
  <input required={required} value={fields[key]||''} onChange={e=>update(key,e.target.value)}/></label>
 const selector=<label>ห้อง<select value={unitId} onChange={e=>setUnitId(e.target.value)}>
  {kind==='announcements'&&<option value="">ทั้งหมด</option>}
  {kind!=='announcements'&&<option value="">-- เลือกห้อง --</option>}
  {units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
 </select></label>
 const itemName=(i:Item)=>i.title||i.carrier||i.plate||i.name||i.note||i.id.slice(0,8)
 return <main className={dashboardStyles.detail}><div className={dashboardStyles.detailInner}>
  <header className={dashboardStyles.detailHeader}><a className={dashboardStyles.detailBrand} href="/cloud?tab=services">StayHub <span>Cloud</span></a><a className={dashboardStyles.back} href="/cloud?tab=services">กลับหน้าจัดการ</a></header>
  <h1>งานบริการ · StayHub Cloud</h1>
  <p className="muted">ข้อมูลจากฐาน PostgreSQL/Neon · ทุกคำขอตรวจสิทธิ์ที่พักและห้องโดย Server</p>
  <div className="subnav">{kinds.map(k=><button className="btn secondary" type="button" key={k} aria-current={kind===k?'page':undefined} disabled={busy} onClick={()=>{setKind(k);setFields({});setPinned(false);setUnitId('');setNotice('');setReadyKey('');window.history.replaceState(null,'','?kind='+k)}}>{labels[k]}</button>)}</div>
  
  {error&&<p role="alert" className="card section" style={{color:'crimson'}}>{error}</p>}
  {notice&&<p role="status" className="card section">{notice}</p>}
  {loading&&<p role="status">กำลังโหลดข้อมูล...</p>}
  {!propertyId&&!error&&!loading&&<p className="muted">ยังไม่มีที่พักที่ได้รับอนุมัติ หรือกำลังตรวจสอบบัญชี</p>}
  {propertyId&&readyKey===propertyId+':'+kind&&!loading&&<><section className="card section"><h2>{labels[kind]}</h2>
   {(owner&&kind!=='rides'||!owner&&['vehicles','rides'].includes(kind))&&<form onSubmit={e=>void submit(e)} className="list">
    {['announcements','parcels','vehicles','rides','documents'].includes(kind)&&selector}
    {kind==='announcements'&&<>{input('title','หัวข้อ')}<label>รายละเอียด<textarea required maxLength={4000} value={fields.body||''} onChange={e=>update('body',e.target.value)}/></label>
     <label><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)}/> ปักหมุด</label></>}
    {kind==='parcels'&&<>{input('carrier','บริษัทขนส่ง')}{input('tracking','เลขพัสดุ',false)}</>}
    {kind==='vehicles'&&<>{input('plate','ทะเบียนรถ')}{input('vehicleType','ประเภทรถ')}</>}
    {kind==='drivers'&&<>{input('name','ชื่อคนขับ')}{input('phone','เบอร์โทร')}{input('vehicleType','ประเภทรถ')}</>}
    {kind==='rides'&&<><label>คนขับ (ไม่เลือกได้)<select value={fields.driverId||''} onChange={e=>update('driverId',e.target.value)}>
     <option value="">เลือกทีหลัง</option>{drivers.filter(i=>i.active).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
     {input('note','รายละเอียดการเดินทาง',false)}</>}
    {kind==='documents'&&<>{input('title','หัวข้อเอกสาร')}<label>ข้อความที่ผู้พักเห็น<textarea maxLength={4000} value={fields.description||''} onChange={e=>update('description',e.target.value)}/></label>
     <p className="muted">รองรับข้อความเท่านั้น ไม่รับอัปโหลดเอกสารส่วนบุคคลก่อนมี Storage ที่ตรวจสิทธิ์ครบ</p></>}
    {kind==='settings'&&<><label>ค่าน้ำ/หน่วย<input type="number" min="0" step="0.01" value={settings.water_rate} onChange={e=>setSettings(s=>({...s,water_rate:e.target.value}))}/></label>
     <label>ค่าไฟ/หน่วย<input type="number" min="0" step="0.01" value={settings.electric_rate} onChange={e=>setSettings(s=>({...s,electric_rate:e.target.value}))}/></label>
     <label>วันครบกำหนด<input type="number" min="1" max="28" value={settings.due_day} onChange={e=>setSettings(s=>({...s,due_day:Number(e.target.value)}))}/></label>
     <label>ค่าปรับ<input type="number" min="0" step="0.01" value={settings.late_fee} onChange={e=>setSettings(s=>({...s,late_fee:e.target.value}))}/></label>
     <p className="muted">ค่าที่ตั้งนี้เป็นค่าเริ่มต้นเพื่อดูแลหอพัก ขณะนี้ API บิลใช้ค่าอัตราจากแต่ละครั้งที่บันทึกมิเตอร์</p></>}
    <button type="submit" className="btn" disabled={busy||(!unitId&&['parcels','vehicles','rides','documents'].includes(kind))}>{busy?'กำลังบันทึก...':'บันทึก '+labels[kind]}</button>
   </form>}
   {!owner&&kind==='settings'&&<p className="muted">เฉพาะเจ้าของที่พัก</p>}
   <h3 className="section">รายการล่าสุด</h3>
   {kind==='settings'?<p className="muted">{items.length?'มีค่าที่บันทึกแล้ว':'ยังไม่ได้ตั้งราคา'}</p>:!items.length?<p>ยังไม่มีรายการ</p>:<div className="list">{items.map(i=><div key={i.id} className="row">
    <div><strong>{itemName(i)}</strong>
     {i.body&&<p>{i.body}</p>}
     {i.description&&<p>{i.description}</p>}
     <p className="muted">{i.status||''} {i.tracking||''} {i.phone||''} {i.vehicle_type||''} {i.active===false?'ปิดรับงาน':''}</p>
    </div>
    {owner&&kind==='announcements'&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>{if(window.confirm('หยุดแสดงประกาศนี้?'))void run({propertyId,action:'announcement-archive',id:i.id})}}>เก็บประกาศ</button>}
    {owner&&kind==='parcels'&&i.status==='waiting'&&<div className="flow">
     <button type="button" className="btn secondary" disabled={busy} onClick={()=>void run({propertyId,action:'parcel-status',id:i.id,status:'picked_up'})}>รับแล้ว</button>
     <button type="button" className="btn secondary" disabled={busy} onClick={()=>void run({propertyId,action:'parcel-status',id:i.id,status:'returned'})}>ส่งคืน</button>
    </div>}
    {owner&&kind==='vehicles'&&i.status!=='approved'&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>void run({propertyId,action:'vehicle-review',id:i.id,status:'approved'})}>อนุมัติ</button>}
    {owner&&kind==='vehicles'&&i.status==='approved'&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>void run({propertyId,action:'vehicle-review',id:i.id,status:'revoked'})}>ยกเลิก</button>}
    {owner&&kind==='drivers'&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>void run({propertyId,action:'driver-active',id:i.id,active:!i.active})}>{i.active?'ปิดรับงาน':'เปิดรับงาน'}</button>}
    {owner&&kind==='rides'&&i.status!=='completed'&&i.status!=='cancelled'&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>void run({propertyId,action:'ride-status',id:i.id,status:i.status==='requested'?'accepted':i.status==='accepted'?'on_the_way':i.status==='on_the_way'?'arrived':'completed'})}>{i.status==='requested'?'รับงาน':i.status==='accepted'?'เริ่มเดินทาง':i.status==='on_the_way'?'ถึงจุดรับ':'จบงาน'}</button>}
    {owner&&kind==='rides'&&i.status==='requested'&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>{if(window.confirm('ยกเลิกคำขอนี้?'))void run({propertyId,action:'ride-status',id:i.id,status:'cancelled'})}}>ยกเลิกงาน</button>}
    {owner&&kind==='documents'&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>{if(window.confirm('ลบข้อความนี้?'))void run({propertyId,action:'document-remove',id:i.id})}}>ลบ</button>}
   </div>)}</div>}
  </section></>}
 </div></main>
}
