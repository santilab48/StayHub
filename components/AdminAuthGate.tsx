'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '../lib/supabase-browser'

export default function AdminAuthGate({ tenantSlug, children }:{ tenantSlug:string; children:ReactNode }){
  const supabase=useMemo(()=>createSupabaseBrowser(),[])
  const router=useRouter()
  const [state,setState]=useState<'checking'|'allowed'|'denied'>('checking')
  const [message,setMessage]=useState('กำลังตรวจสิทธิ์แอดมิน...')

  useEffect(()=>{let alive=true;(async()=>{
    const {data:{user},error:userError}=await supabase.auth.getUser()
    if(!alive)return
    if(userError||!user){setState('denied');setMessage('กรุณาเข้าสู่ระบบก่อนเข้าแอดมิน');router.replace(`/t/${tenantSlug}`);return}

    const {data:profile,error:profileError}=await supabase
      .from('profiles')
      .select('tenant_id,role')
      .eq('auth_user_id',user.id)
      .maybeSingle()
    if(!alive)return
    if(profileError||!profile||!['owner','admin'].includes(profile.role)){
      setState('denied');setMessage('บัญชีนี้ไม่ใช่แอดมินของ OA');router.replace(`/t/${tenantSlug}/app`);return
    }

    const {data:tenant,error:tenantError}=await supabase
      .from('tenants')
      .select('id,slug,app_slug,status,billing_status,locked_at')
      .eq('id',profile.tenant_id)
      .maybeSingle()
    if(!alive)return
    if(tenantError||!tenant){setState('denied');setMessage('ไม่พบ OA ที่ผูกกับบัญชีนี้');router.replace('/');return}

    const slugMatches=tenant.slug===tenantSlug||tenant.app_slug===tenantSlug
    if(!slugMatches){setState('denied');setMessage('บัญชีนี้ไม่มีสิทธิ์เข้า OA นี้');router.replace(`/t/${tenant.slug||tenant.app_slug||tenantSlug}/admin`);return}

    const {data:active,error:activeError}=await supabase.rpc('current_tenant_active')
    if(!alive)return
    if(activeError||active!==true||tenant.status==='suspended'||tenant.locked_at){
      setState('denied');setMessage('OA นี้ถูกจำกัดการใช้งาน กรุณาตรวจสอบสถานะสมาชิก');router.replace(`/t/${tenantSlug}/blocked`);return
    }

    setState('allowed')
  })();return()=>{alive=false}},[router,supabase,tenantSlug])

  if(state!=='allowed')return <main className="container"><section className="card"><h1>🔐 แอดมิน</h1><p className="muted">{message}</p></section></main>
  return <>{children}</>
}
