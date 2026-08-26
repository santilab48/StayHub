import AdminShell from '../../../../../../../components/AdminShell'
import BillTemplateDesigner from '../../../../../../../components/BillTemplateDesigner'
import { tenantRoutes } from '../../../../../../../lib/routes'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  return <AdminShell slug={tenantSlug} title="ออกแบบบิล">
    <div className="toolbar"><div><h2>แบบบิลของหอ</h2><p className="muted">เจ้าของเลือกด้วยการติ๊กว่าจะให้ส่วนไหนแสดงในบิล โดยไม่เปลี่ยนยอดคำนวณจริง</p></div><a className="btn secondary" href={r.adminFinance}>กลับการเงิน</a></div>
    <BillTemplateDesigner/>
  </AdminShell>
}
