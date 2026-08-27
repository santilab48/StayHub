import { ReactNode } from 'react'
import AdminAuthGate from '../../../../components/AdminAuthGate'

export default async function AdminLayout({children,params}:{children:ReactNode;params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminAuthGate tenantSlug={tenantSlug}>{children}</AdminAuthGate>
}
