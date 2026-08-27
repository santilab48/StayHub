'use client'

import {ChangeEvent,FormEvent,useEffect,useMemo,useRef,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type Room={id:string;room_no:string;monthly_rent:number|null;status:string}
type LeaseRow={id:string;profile_id:string;start_date:string;end_date:string|null;rent_amount:number;deposit_amount:number;status:string}
type ProfileRow={id:string;full_name:string|null;phone:string|null}
type PrivateDoc={image_path:string}

const today=()=>new Date().toISOString().slice(0,10)

export default function RoomTenantAssignmentForm(){
 const supabase=useMemo(()=>createSupabaseBrowser(),[])
 const search=useSearchParams()
 const roomId=search.get('room_id')||''
 const cardRef=useRef<HTMLInputElement>(null)
 const [room,setRoom]=useState<Room|null>(null)
 const [activeLease,setActiveLease]=useState<LeaseRow|null>(null)
 const [activeTenant,setActiveTenant]=useState<ProfileRow|null>(null)
 const [tenantId,setTenantId]=useState('')
 const [staffProfileId,setStaffProfileId]=useState('')
 const [privateDoc,setPrivateDoc]=useState<PrivateDoc|null>(null)
 const [idCardFile,setIdCardFile]=useState<File|null>(null)
 const [fullName,setFullName]=useState('')
 const [phone,setPhone]=useState('')
 const [startDate,setStartDate]=useState(today())
 const [endDate,setEndDate]=useState('')
 const [rent,setRent]=useState('')
 const [deposit,setDeposit]=useState('0')
 const [status,setStatus]=useState('')
 const [busy,setBusy]=useState(false)
 const [cardBusy,setCardBusy]=useState(false)

 const getStaff=async()=>{
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return null
  const {data:p}=await supabase.from('profiles').select('id,tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
  if(!p||!['owner','admin','staff'].includes(p.role))return null
  setTenantId(p.tenant_id);setStaffProfileId(p.id)
  return p
 }

 const load=async()=>{
  setStatus('');setRoom(null);setActiveLease(null);setActiveTenant(null);setPrivateDoc(null);setIdCardFile(null)
  if(!roomId)return
  await getStaff()
  const {data:r,error:re}=await supabase.from('rooms').select('id,room_no,monthly_rent,status').eq('id',roomId).maybeSingle()
  if(re||!r){setStatus(re?.message||'ไม่พบห้องที่เลือก');return}
  setRoom(r as Room)
  setRent(String((r as Room).monthly_rent||0))
  const {data:l,error:le}=await supabase.from('leases').select('id,profile_id,start_date,end_date,rent_amount,deposit_amount,status').eq('room_id',roomId).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(le){setStatus(le.message);return}
  if(l){
   const lease=l as LeaseRow
   setActiveLease(lease)
   const [{data:p},{data:d}]=await Promise.all([
    supabase.from('profiles').select('id,full_name,phone').eq('id',lease.profile_id).maybeSingle(),
    supabase.from('tenant_private_documents').select('image_path').eq('lease_id',lease.id).eq('doc_type','id_card').maybeSingle()
   ])
   setActiveTenant((p as ProfileRow)||null)
   setPrivateDoc((d as PrivateDoc)||null)
  }
 }

 useEffect(()=>{void load()},[roomId])

 const chooseCard=(e:ChangeEvent<HTMLInputElement>)=>{
  const f=e.target.files?.[0]||null
  e.target.value=''
  if(!f)return
  if(!['image/jpeg','image/png','image/webp'].includes(f.type)){setStatus('รูปบัตรรองรับ JPG, PNG, WEBP เท่านั้น');return}
  if(f.size>10*1024*1024){setStatus('รูปบัตรต้องไม่เกิน 10 MB');return}
  setIdCardFile(f);setStatus('เลือกรูปบัตรแล้ว · กดบันทึกเพื่อเก็บแบบ private')
 }

 const storeIdCard=async(leaseId:string,profileId:string,file:File)=>{
  const staff=tenantId&&staffProfileId?{tenant_id:tenantId,id:staffProfileId}:await getStaff()
  if(!staff)throw new Error('ไม่มีสิทธิ์เก็บรูปบัตร')
  const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
  const path=`${staff.tenant_id}/${leaseId}/id-card-${Date.now()}.${ext}`
  const {error:upErr}=await supabase.storage.from('stayhub-private-tenant-docs').upload(path,file,{contentType:file.type,upsert:false})
  if(upErr)throw upErr
  const {data:old}=await supabase.from('tenant_private_documents').select('image_path').eq('lease_id',leaseId).eq('doc_type','id_card').maybeSingle()
  const {error:dbErr}=await supabase.from('tenant_private_documents').upsert({tenant_id:staff.tenant_id,room_id:roomId,lease_id:leaseId,profile_id:profileId,doc_type:'id_card',image_path:path,created_by:staff.id,updated_at:new Date().toISOString()},{onConflict:'tenant_id,lease_id,doc_type'})
  if(dbErr){await supabase.storage.from('stayhub-private-tenant-docs').remove([path]);throw dbErr}
  if(old?.image_path&&old.image_path!==path)await supabase.storage.from('stayhub-private-tenant-docs').remove([old.image_path])
 }

 const replaceCard=async()=>{
  if(!activeLease||!idCardFile)return
  setCardBusy(true);setStatus('กำลังเก็บรูปบัตรแบบ private...')
  try{
   await storeIdCard(activeLease.id,activeLease.profile_id,idCardFile)
   setStatus('เก็บรูปบัตรแล้ว · หลังบ้านเท่านั้น ไม่แสดงในห้องของฉัน')
   await load()
  }catch(err:any){setStatus(`เก็บรูปบัตรไม่สำเร็จ: ${err?.message||'unknown error'}`)}
  setCardBusy(false)
 }

 const submit=async(e:FormEvent)=>{
  e.preventDefault()
  if(!roomId){setStatus('เลือกห้องด้านบนก่อน');return}
  if(!fullName.trim()){setStatus('กรอกชื่อผู้เช่า');return}
  if(!idCardFile){setStatus('ถ่ายหรือแนบรูปบัตรประชาชนก่อนบันทึกผู้เช่า');return}
  setBusy(true);setStatus('กำลังผูกผู้เช่ากับห้อง...')
  const {data:leaseId,error}=await supabase.rpc('owner_assign_tenant_to_room',{
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
  try{
   const {data:lease}=await supabase.from('leases').select('profile_id').eq('id',leaseId).single()
   if(!lease)throw new Error('ไม่พบสัญญาที่เพิ่งสร้าง')
   setStatus('ผูกผู้เช่าแล้ว · กำลังเก็บรูปบัตร...')
   await storeIdCard(String(leaseId),lease.profile_id,idCardFile)
   setStatus('บันทึกครบแล้ว · ผู้เช่า + ห้อง + รูปบัตร private')
  }catch(err:any){setStatus(`ผูกผู้เช่าแล้ว แต่เก็บรูปบัตรไม่สำเร็จ: ${err?.message||'unknown error'} · สามารถแนบซ้ำในกล่องนี้ได้`)}
  setFullName('');setPhone('');setIdCardFile(null)
  await load();setBusy(false)
 }

 const cardPicker=<>
  <input ref={cardRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={chooseCard} style={{display:'none'}}/>
  <div className="toolbar section">
   <div><strong>🪪 รูปบัตรประชาชน</strong><p className="muted">เก็บ private หลังบ้านเท่านั้น · ไม่แสดงใน “ห้องของฉัน”</p></div>
   <button type="button" className="btn secondary" disabled={busy||cardBusy} onClick={()=>cardRef.current?.click()}>{idCardFile?'เปลี่ยนภาพบัตร':'ถ่าย/เลือกภาพบัตร'}</button>
  </div>
  <div className="noticeBox"><strong>{privateDoc?'✓ มีรูปบัตรเก็บแล้ว':idCardFile?'✓ เลือกภาพแล้ว รอบันทึก':'ยังไม่มีรูปบัตร'}</strong></div>
 </>

 if(!roomId)return <section className="section card"><h2>👤 ผูกผู้เช่าเข้าห้อง</h2><p className="muted">เลือกห้องด้านบนก่อน แล้วฟอร์มนี้จะผูกผู้เช่ากับห้องนั้นโดยตรง</p></section>

 return <section className="section card">
  <div className="toolbar"><div><h2>👤 ผู้เช่าหลักของห้อง {room?.room_no||''}</h2><p className="muted">ใช้ห้องที่เลือกด้านบนเป็นปลายทาง ไม่ต้องเลือกห้องซ้ำ</p></div><span className="pill">room_id ผูกแล้ว</span></div>

  {activeLease?<div className="section">
   <div className="noticeBox card"><strong>มีผู้เช่าหลักแล้ว: {activeTenant?.full_name||'ผู้เช่า'}</strong><p className="muted">โทร {activeTenant?.phone||'—'} · เริ่ม {activeLease.start_date} · ค่าเช่า {Number(activeLease.rent_amount).toLocaleString('th-TH')} บาท</p><p className="muted">ถ้าจะเปลี่ยนผู้เช่า ต้องปิดสัญญาเดิมก่อน ระบบไม่สร้าง active lease ซ้อนห้องเดียวกัน</p></div>
   {cardPicker}
   {idCardFile&&<div className="toolbar section"><span className="muted">ภาพจะผูกกับ active lease ของห้องนี้</span><button type="button" className="btn" disabled={cardBusy} onClick={replaceCard}>{cardBusy?'กำลังเก็บ...':privateDoc?'บันทึกภาพบัตรใหม่':'บันทึกภาพบัตร'}</button></div>}
  </div>:
  <form onSubmit={submit} className="section">
   <div className="formGrid">
    <label>ชื่อผู้เช่า<input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="ชื่อ-นามสกุล" required/></label>
    <label>เบอร์โทร<input value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" placeholder="08xxxxxxxx"/></label>
    <label>วันเข้าอยู่<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} required/></label>
    <label>วันสิ้นสุดสัญญา<input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></label>
    <label>ค่าเช่า/เดือน<input type="number" min="0" step="0.01" value={rent} onChange={e=>setRent(e.target.value)} required/></label>
    <label>เงินประกัน<input type="number" min="0" step="0.01" value={deposit} onChange={e=>setDeposit(e.target.value)} required/></label>
   </div>
   {cardPicker}
   <div className="toolbar section"><p className="muted">กดครั้งเดียว ระบบสร้างผู้เช่า + active lease + เก็บรูปบัตร private ของห้อง {room?.room_no||''}</p><button className="btn" disabled={busy}>{busy?'กำลังบันทึก...':'บันทึกและผูกเข้าห้องนี้'}</button></div>
  </form>}
  {status&&<div className="noticeBox card section"><strong>สถานะ</strong><p className="muted">{status}</p></div>}
 </section>
}
