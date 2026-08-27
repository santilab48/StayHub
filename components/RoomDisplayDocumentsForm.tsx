'use client'

import {ChangeEvent,useEffect,useMemo,useRef,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type DocType='contract'|'rules'
type SavedDoc={doc_type:DocType;title:string|null;image_path:string}

export default function RoomDisplayDocumentsForm(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const search=useSearchParams()
  const roomId=search.get('room_id')||''
  const [tenantId,setTenantId]=useState('')
  const [profileId,setProfileId]=useState('')
  const [docs,setDocs]=useState<SavedDoc[]>([])
  const [busy,setBusy]=useState<DocType|null>(null)
  const [status,setStatus]=useState('เลือกห้องด้านบน แล้วกดปุ่มอัปโหลดได้เลย')
  const contractRef=useRef<HTMLInputElement>(null)
  const rulesRef=useRef<HTMLInputElement>(null)

  const load=async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('กรุณาเข้าสู่ระบบ');return}
    const {data:p}=await supabase.from('profiles').select('id,tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
    if(!p||!['owner','admin','staff'].includes(p.role)){setStatus('ไม่มีสิทธิ์');return}
    setTenantId(p.tenant_id);setProfileId(p.id)
    if(!roomId){setDocs([]);setStatus('เลือกห้องด้านบนก่อน');return}
    const {data,error}=await supabase.from('room_display_documents').select('doc_type,title,image_path').eq('tenant_id',p.tenant_id).eq('room_id',roomId)
    if(error){setStatus(`โหลดเอกสารไม่สำเร็จ: ${error.message}`);return}
    setDocs((data||[]) as SavedDoc[])
    setStatus('รูปที่บันทึกจะไปแสดงใน “ห้องของฉัน” ของห้องนี้โดยตรง')
  }

  useEffect(()=>{void load()},[roomId])

  const upload=async(type:DocType,e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]
    e.target.value=''
    if(!file)return
    if(!roomId||!tenantId||!profileId){setStatus('เลือกห้องก่อนอัปโหลด');return}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setStatus('รองรับ JPG, PNG, WEBP เท่านั้น');return}
    if(file.size>10*1024*1024){setStatus('ไฟล์ต้องไม่เกิน 10 MB');return}
    setBusy(type);setStatus('กำลังอัปโหลด...')
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
    const path=`${tenantId}/${roomId}/${type}-${Date.now()}.${ext}`
    const old=docs.find(d=>d.doc_type===type)
    const {error:upErr}=await supabase.storage.from('stayhub-room-documents').upload(path,file,{contentType:file.type,upsert:false})
    if(upErr){setBusy(null);setStatus(`อัปโหลดไม่สำเร็จ: ${upErr.message}`);return}
    const {error:dbErr}=await supabase.from('room_display_documents').upsert({tenant_id:tenantId,room_id:roomId,doc_type:type,title:type==='contract'?'สัญญา':'กฎระเบียบ',image_path:path,created_by:profileId,updated_at:new Date().toISOString()},{onConflict:'tenant_id,room_id,doc_type'})
    if(dbErr){await supabase.storage.from('stayhub-room-documents').remove([path]);setBusy(null);setStatus(`บันทึกไม่สำเร็จ: ${dbErr.message}`);return}
    if(old?.image_path&&old.image_path!==path)await supabase.storage.from('stayhub-room-documents').remove([old.image_path])
    await load();setBusy(null);setStatus(type==='contract'?'บันทึกรูปสัญญาแล้ว':'บันทึกรูปกฎระเบียบแล้ว')
  }

  const Box=({type,label,icon,inputRef}:{type:DocType;label:string;icon:string;inputRef:React.RefObject<HTMLInputElement|null>})=>{
    const saved=docs.find(d=>d.doc_type===type)
    return <div className="card">
      <div className="toolbar"><div><h3>{icon} {label}</h3><p className="muted">{saved?'มีรูปแล้ว · อัปโหลดใหม่เพื่อแทนที่':'ยังไม่มีรูป'}</p></div><span className="pill">{saved?'พร้อมให้ผู้เช่าดู':'ยังไม่มีไฟล์'}</span></div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={!roomId||Boolean(busy)} onChange={e=>upload(type,e)} style={{display:'none'}}/>
      <button type="button" className="btn section" disabled={!roomId||Boolean(busy)} onClick={()=>inputRef.current?.click()}>{busy===type?'กำลังอัปโหลด...':saved?'เลือกรูปใหม่':'เลือกและอัปโหลดรูป'}</button>
    </div>
  }

  return <section className="section card">
    <h2>รูปสัญญาและกฎระเบียบ</h2>
    <p className="muted">ใช้ห้องที่เลือกด้านบนโดยตรง ไม่ต้องเลือกห้องซ้ำ</p>
    <div className="grid section"><Box type="contract" label="สัญญา" icon="📄" inputRef={contractRef}/><Box type="rules" label="กฎระเบียบ" icon="📘" inputRef={rulesRef}/></div>
    <div className="noticeBox section"><strong>สถานะ</strong><p className="muted">{status}</p></div>
  </section>
}
