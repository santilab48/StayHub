import {redirect} from 'next/navigation'

export default async function AdminSection({params}:{params:Promise<{tenantSlug:string;section:string[]}>}){
  const {tenantSlug}=await params
  redirect(`/t/${tenantSlug}/admin`)
}
