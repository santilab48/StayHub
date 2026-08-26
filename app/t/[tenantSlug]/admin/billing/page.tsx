import AdminShell from '../../../../../components/AdminShell'
import FinanceTabs from '../../../../../components/FinanceTabs'
import AdminBillBuilder from '../../../../../components/AdminBillBuilder'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="ทำบิล">
    <FinanceTabs slug={tenantSlug}/>
    <section className="card"><div className="toolbar"><div><h2>ออกบิลจากห้องเดียวครบทุกอย่าง</h2><p className="muted">เลือกห้อง → ดึงสัญญา + มิเตอร์ที่ยืนยันแล้ว → เติมน้ำ/ไฟ/เน็ต/จอดรถ → ตรวจยอด → เลือกผู้รับ → ตั้งเวลาส่ง LINE</p></div><span className="pill">Billing workspace</span></div></section>
    <AdminBillBuilder/>
  </AdminShell>
}
