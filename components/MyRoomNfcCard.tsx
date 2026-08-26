'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'
import { tenantRoutes } from '../lib/routes'

type Credential={id:string;display_name:string|null;credential_type:string;provisioning_status:string;valid_from:string|null;valid_until:string|null}

export default function MyRoomNfcCard({slug}:{slug:string}){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const r=tenantRoutes(slug)
  const [credential,setCredential]=useState<Credential|null>(null)
  const [loading,setLoading]=useState(true)

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setLoading(false);return}
    const {data:profile}=await supabase.from('profiles').select('id').eq('auth_user_id',user.id).maybeSingle()
    if(!profile){setLoading(false);return}
    const {data:holders}=await supabase.from('access_holders').select('id').eq('profile_id',profile.id).eq('status','active')
    const ids=(holders||[]).map(h=>h.id)
    if(!ids.length){setLoading(false);return}
    const {data:c}=await supabase.from('access_credentials').select('id,display_name,credential_type,provisioning_status,valid_from,valid_until').in('holder_id',ids).in('provisioning_status',['pending','ready_to_provision','provisioning','active']).order('created_at',{ascending:false}).limit(1).maybeSingle()
    setCredential(c||null);setLoading(false)
  })()},[supabase])

  return <section className="section card">
    <div className="toolbar"><div><h3>📱 NFC ของฉัน</h3><p className="muted">สิทธิ์ที่เจ้าของหอออกให้ จะแสดงที่นี่อัตโนมัติ ผู้เช่าแก้หรือสร้างเองไม่ได้</p></div><span className="pill">{loading?'กำลังโหลด...':credential?credential.provisioning_status:'ยังไม่มีสิทธิ์'}</span></div>
    {credential?<div className="splitGrid"><div><div className="infoRow"><span className="muted">ประเภท</span><strong>{credential.credential_type}</strong></div><div className="infoRow"><span className="muted">สถานะ</span><strong>{credential.provisioning_status}</strong></div></div><div><div className="infoRow"><span className="muted">เริ่มใช้</span><strong>{credential.valid_from?new Date(credential.valid_from).toLocaleString('th-TH'):'—'}</strong></div><div className="infoRow"><span className="muted">หมดอายุ</span><strong>{credential.valid_until?new Date(credential.valid_until).toLocaleString('th-TH'):'ไม่กำหนด'}</strong></div></div></div>:<p className="muted">ยังไม่มี NFC ที่เจ้าของออกให้ห้องนี้</p>}
    <div className="section"><a className="btn secondary" href={r.myAccessKey}>ดู NFC ของฉัน</a></div>
  </section>
}
