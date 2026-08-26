import AdminShell from '../../../../../components/AdminShell'
import AdminRepairManager from '../../../../../components/AdminRepairManager'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="งานซ่อม">
    <AdminRepairManager/>
    <section className="section card noticeBox"><strong>เส้นสถานะ</strong><p className="muted">submitted → accepted → scheduled → in_progress → completed → closed โดย completed ยังถือว่าเป็นงานค้างจนเจ้าของกดปิดงานเอง</p></section>
  </AdminShell>
}
