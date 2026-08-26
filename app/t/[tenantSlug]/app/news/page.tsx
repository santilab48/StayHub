import TenantShell from '../../../../../components/TenantShell'
import EmptyState from '../../../../../components/EmptyState'
export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){const {tenantSlug}=await params;return <TenantShell slug={tenantSlug} title="ข่าวสาร"><EmptyState title="ยังไม่มีประกาศ" detail="ประกาศรองรับทั้งหอ อาคาร และห้องเฉพาะเจาะจง โดยทุก record ถูก tenant scoped"/></TenantShell>}
