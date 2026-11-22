import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'

function createRequestSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing public Supabase configuration')
  return { url, key }
}

async function getServerAuthClient() {
  const {url,key}=createRequestSupabase()
  const cookieStore=await cookies()
  return createServerClient(url,key,{
    cookies: {
      getAll(){return cookieStore.getAll()},
      // Server Component layouts are read-only; session refresh cookies must be
      // persisted by a dedicated middleware/proxy before full production rollout.
      setAll(){}
    }
  })
}

export async function requirePlatformAdmin() {
  const supabase=await getServerAuthClient()
  const {data:{user},error:userError}=await supabase.auth.getUser()
  if(userError || !user) redirect('/')
  const {data:admin,error}=await supabase.from('platform_admins')
    .select('id').eq('auth_user_id',user.id).eq('active',true).maybeSingle()
  if(error || !admin) redirect('/')
}

export async function requireTenantAdmin(slug:string) {
  const supabase=await getServerAuthClient()
  const {data:{user},error:userError}=await supabase.auth.getUser()
  if(userError || !user) redirect(`/t/${encodeURIComponent(slug)}`)

  const {data:profile,error:profileError}=await supabase.from('profiles')
    .select('tenant_id,role').eq('auth_user_id',user.id).maybeSingle()
  if(profileError || !profile || !['owner','admin'].includes(profile.role))
    redirect(`/t/${encodeURIComponent(slug)}`)

  const {data:tenant,error:tenantError}=await supabase.from('tenants')
    .select('id,slug,app_slug,status,locked_at')
    .eq('id',profile.tenant_id).maybeSingle()
  if(tenantError || !tenant || (tenant.slug!==slug && tenant.app_slug!==slug))
    redirect('/')

  const {data:active,error:activeError}=await supabase.rpc('current_tenant_active')
  if(activeError || active!==true || tenant.status==='suspended' || tenant.locked_at)
    redirect(`/t/${encodeURIComponent(slug)}/blocked`)
}
