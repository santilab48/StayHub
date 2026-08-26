import AdminShell from '../../../../../../../components/AdminShell'
import FinanceTabs from '../../../../../../../components/FinanceTabs'
import BillTemplateDesigner from '../../../../../../../components/BillTemplateDesigner'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="การเงิน">
    <FinanceTabs slug={tenantSlug}/>
    <div className="toolbar"><div><h2>ออกแบบบิล</h2><p className="muted">เจ้าของติ๊กเลือกว่าจะให้ส่วนไหนแสดงในบิล โดยไม่เปลี่ยนยอดคำนวณจริง</p></div></div>
    <BillTemplateDesigner/>
  </AdminShell>
}
