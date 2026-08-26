import TenantShell from '../../../../../../components/TenantShell'
import RoomNav from '../../../../../../components/RoomNav'
import ResidentContractPanel from '../../../../../../components/ResidentContractPanel'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <TenantShell slug={tenantSlug} title="สัญญาเช่า">
    <RoomNav slug={tenantSlug}/>
    <ResidentContractPanel/>
  </TenantShell>
}
