import AdminShell from '../../../../../components/AdminShell'
import AdminResidentsList from '../../../../../components/AdminResidentsList'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="ผู้เช่า">
    <AdminResidentsList slug={tenantSlug}/>
  </AdminShell>
}
