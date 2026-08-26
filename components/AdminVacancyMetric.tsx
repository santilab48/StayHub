'use client'
import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '../lib/supabase-browser'

export default function AdminVacancyMetric(){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const [vacant,setVacant]=useState<number|null>(null)

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return
    const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
    if(!profile||!['owner','admin','staff'].includes(profile.role))return
    const [{data:settings},{data:leases}]=await Promise.all([
      supabase.from('tenant_settings').select('declared_room_count').eq('tenant_id',profile.tenant_id).maybeSingle(),
      supabase.from('leases').select('room_id').eq('tenant_id',profile.tenant_id).eq('status','active')
    ])
    const total=Number(settings?.declared_room_count||0)
    const occupied=new Set((leases||[]).map((x:any)=>x.room_id)).size
    setVacant(Math.max(total-occupied,0))
  })()},[supabase])

  return <div className="metric"><span className="muted">ห้องว่าง</span><strong>{vacant===null?'—':vacant}</strong><small>คำนวณจากห้องทั้งหมด - สัญญา active</small></div>
}
