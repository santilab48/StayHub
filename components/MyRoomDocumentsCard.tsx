'use client'

import {useEffect,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type Doc={doc_type:'contract'|'rules';title:string|null;image_path:string}
type ViewDoc=Doc&{url:string}

export default function MyRoomDocumentsCard(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [docs,setDocs]=useState<ViewDoc[]>([])
  const [status,setStatus]=useState('กำลังโหลดเอกสาร...')

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('กรุณาเข้าสู่ระบบ');return}
    const {data:p}=await supabase.from('profiles').select('id').eq('auth_user_id',user.id).maybeSingle()
    if(!p){setStatus('ไม่พบข้อมูลสมาชิก');return}
    const {data:l}=await supabase.from('leases').select('room_id').eq('profile_id',p.id).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle()
    if(!l){setStatus('ยังไม่มีห้องที่ผูกกับสมาชิกนี้');return}
    const {data,error}=await supabase.from('room_display_documents').select('doc_type,title,image_path').eq('room_id',l.room_id)
    if(error){setStatus(`โหลดเอกสารไม่สำเร็จ: ${error.message}`);return}
    const rows=(data||[]) as Doc[]
    const withUrls=await Promise.all(rows.map(async d=>{
      const {data:signed}=await supabase.storage.from('stayhub-room-documents').createSignedUrl(d.image_path,60*10)
      return signed?.signedUrl?{...d,url:signed.signedUrl}:null
    }))
    setDocs(withUrls.filter(Boolean) as ViewDoc[])
    setStatus(rows.length?'กดดูเอกสารได้เลย':'เจ้าบ้านยังไม่ได้ส่งเอกสาร')
  })()},[supabase])

  const item=(type:'contract'|'rules',label:string,icon:string)=>{
    const d=docs.find(x=>x.doc_type===type)
    return d?<a className="card tile" href={d.url} target="_blank" rel="noreferrer"><span className="icon">{icon}</span><div><h3>{label}</h3><p className="muted">กดดูรูปที่เจ้าบ้านส่ง</p></div></a>:<div className="card tile"><span className="icon">{icon}</span><div><h3>{label}</h3><p className="muted">ยังไม่มีเอกสาร</p></div></div>
  }

  return <section className="myRoomSection">
    <div className="myRoomSectionHead"><div><span>📚</span><h3>เอกสารจากเจ้าบ้าน</h3></div><small>{status}</small></div>
    <div className="grid">{item('contract','สัญญา','📄')}{item('rules','กฎระเบียบ','📘')}</div>
  </section>
}
