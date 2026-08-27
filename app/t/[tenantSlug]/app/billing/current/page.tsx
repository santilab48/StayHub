import TenantShell from '../../../../../../components/TenantShell'
import BillingNav from '../../../../../../components/BillingNav'
import ResidentCurrentInvoice from '../../../../../../components/ResidentCurrentInvoice'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
 const {tenantSlug}=await params
 return <TenantShell slug={tenantSlug} title="บิลปัจจุบัน">
  <BillingNav slug={tenantSlug}/>
  <ResidentCurrentInvoice/>
 </TenantShell>
}
