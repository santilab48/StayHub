import AdminShell from '../../../../../components/AdminShell'
import FinanceTabs from '../../../../../components/FinanceTabs'
import MeterEntryWorkspace from '../../../../../components/MeterEntryWorkspace'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="บันทึกน้ำ / ไฟ">
    <FinanceTabs slug={tenantSlug}/>
    <MeterEntryWorkspace/>
  </AdminShell>
}
