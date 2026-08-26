import AdminShell from '../../../../../../components/AdminShell'
import FinanceTabs from '../../../../../../components/FinanceTabs'
import AdminBillBuilder from '../../../../../../components/AdminBillBuilder'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="การเงิน">
    <FinanceTabs slug={tenantSlug}/>
    <AdminBillBuilder/>
    <section className="section card noticeBox"><strong>หลักการดึงมิเตอร์</strong><p className="muted">ใช้เฉพาะ meter_readings.confirmed_value ที่คนตรวจยืนยันแล้วเท่านั้น ค่าจาก OCR ที่ยังไม่ยืนยันจะไม่ถูกนำไปทำบิลอัตโนมัติ</p></section>
  </AdminShell>
}
