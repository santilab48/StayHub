import AdminShell from '../../../../../../components/AdminShell'
import FinanceTabs from '../../../../../../components/FinanceTabs'
import FinanceRateSettings from '../../../../../../components/FinanceRateSettings'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
 const {tenantSlug}=await params
 return <AdminShell slug={tenantSlug} title="การเงิน"><FinanceTabs slug={tenantSlug}/><FinanceRateSettings/></AdminShell>
}
