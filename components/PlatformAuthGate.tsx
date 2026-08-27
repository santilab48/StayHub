'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '../lib/supabase-browser'

export default function PlatformAuthGate({children}:{children:ReactNode}){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const router=useRouter()
  const [state,setState]=useState<'checking'|'allowed'|'denied'>('checking')
  const [message,setMessage]=useState('กำลังตรวจสิทธิ์ Super Admin...')

  useEffect(()=>{let alive=true;(async()=>{
    const {data:{user},error:userError}=await supabase.auth.getUser()
    if(!alive)return
    if(userError||!user){setState('denied');setMessage('กรุณาเข้าสู่ระบบก่อนเข้า Super Admin');router.replace('/');return}

    const {data:admin,error}=await supabase
      .from('platform_admins')
      .select('id,active')
      .eq('auth_user_id',user.id)
      .eq('active',true)
      .maybeSingle()
    if(!alive)return
    if(error||!admin){setState('denied');setMessage('บัญชีนี้ไม่มีสิทธิ์ Super Admin');router.replace('/');return}

    setState('allowed')
  })();return()=>{alive=false}},[router,supabase])

  if(state!=='allowed')return <main className="container"><section className="card"><h1>🛡️ Super Admin</h1><p className="muted">{message}</p></section></main>
  return <>{children}</>
}
