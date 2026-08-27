import AdminShell from '../../../../../components/AdminShell'
import FinanceTabs from '../../../../../components/FinanceTabs'
import AdminBillBuilder from '../../../../../components/AdminBillBuilder'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="ทำบิล">
    <FinanceTabs slug={tenantSlug}/>
    <section className="card"><div className="toolbar"><div><h2>ออกบิลจากห้องเดียวครบทุกอย่าง</h2><p className="muted">เลือกห้อง → ดึงผู้เช่าและค่าเช่า → กรอกมิเตอร์ → ตรวจรายการ → บันทึก/ส่งบิล</p></div><span className="pill">Billing workspace</span></div></section>
    <AdminBillBuilder slug={tenantSlug}/>
  </AdminShell>
}
