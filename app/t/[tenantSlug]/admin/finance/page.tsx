import AdminShell from '../../../../../components/AdminShell'
import FinanceDashboard from '../../../../../components/FinanceDashboard'
import {tenantRoutes} from '../../../../../lib/routes'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
 const {tenantSlug}=await params
 const r=tenantRoutes(tenantSlug)
 return <AdminShell slug={tenantSlug} title="การเงิน">
  <FinanceDashboard/>
  <section className="section grid">
   <a className="card tile" href={r.adminFinancePayments}><span className="icon">✅</span><div><h3>ตรวจสลิป</h3><p className="muted">อนุมัติแล้ว ยอดจะเข้ารายงานเดือนอัตโนมัติ</p></div></a>
   <a className="card tile" href={r.adminFinanceReceipts}><span className="icon">📄</span><div><h3>ใบเสร็จ</h3><p className="muted">ดูเอกสารรับชำระที่ออกแล้ว</p></div></a>
   <a className="card tile" href={r.adminBillingTab}><span className="icon">🧾</span><div><h3>ไปทำบิล</h3><p className="muted">สร้างและส่งบิลรายห้อง</p></div></a>
  </section>
 </AdminShell>
}
