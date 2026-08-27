'use client'

import {useEffect,useMemo,useState} from 'react'
import {usePathname,useRouter,useSearchParams} from 'next/navigation'
import {createSupabaseBrowser} from '../lib/supabase-browser'

type Room={id:string;room_no:string;floor:string|null;status:string|null}

export default function GeneralRoomContextSelector(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const router=useRouter(),pathname=usePathname(),search=useSearchParams()
  const [rooms,setRooms]=useState<Room[]>([]),[status,setStatus]=useState('กำลังโหลดห้อง...')
  const selected=search.get('room_id')||''

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setStatus('ยังไม่ได้เข้าสู่ระบบ');return}
    const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
    if(!profile||!['owner','admin','staff'].includes(profile.role)){setStatus('ไม่มีสิทธิ์');return}
    const {data,error}=await supabase.from('rooms').select('id,room_no,floor,status').eq('tenant_id',profile.tenant_id).eq('is_enabled',true).order('room_no')
    if(error){setStatus('โหลดห้องไม่สำเร็จ');return}
    setRooms(data||[])
    setStatus(data?.length?'เลือกห้องแล้ว ทุกงานด้านล่างจะผูกห้องนี้':'ยังไม่มีห้อง')
    if(!selected&&data?.length){const p=new URLSearchParams(search.toString());p.set('room_id',data[0].id);router.replace(`${pathname}?${p.toString()}`)}
  })()},[supabase,router,pathname,search,selected])

  const change=(id:string)=>{const p=new URLSearchParams(search.toString());if(id)p.set('room_id',id);else p.delete('room_id');router.replace(`${pathname}?${p.toString()}`)}
  const room=rooms.find(r=>r.id===selected)

  return <section className="card section">
    <div className="toolbar"><div><h2>ห้องที่กำลังจัดการ</h2><p className="muted">เลือกครั้งเดียว ทุกปุ่มและการบันทึกในแท็บทั่วไปต้องใช้ room_id ห้องนี้ต่อเนื่อง</p></div><span className="pill">{status}</span></div>
    <div className="formGrid"><label>ห้อง<select value={selected} onChange={e=>change(e.target.value)}><option value="">เลือกห้อง</option>{rooms.map(r=><option value={r.id} key={r.id}>{r.room_no}{r.floor?` · ชั้น ${r.floor}`:''}</option>)}</select></label><label>ห้องปัจจุบัน<input readOnly value={room?`${room.room_no}${room.floor?` · ชั้น ${room.floor}`:''}`:'ยังไม่ได้เลือก'}/></label></div>
    {room&&<div className="flow"><span>room_id: {room.id.slice(0,8)}…</span><span>สถานะ: {room.status||'—'}</span></div>}
  </section>
}
