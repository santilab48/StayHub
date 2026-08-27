import AdminShell from '../../../../../../components/AdminShell'
import FinanceTabs from '../../../../../../components/FinanceTabs'
import AdminBillBuilder from '../../../../../../components/AdminBillBuilder'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="การเงิน">
    <FinanceTabs slug={tenantSlug}/>
    <AdminBillBuilder slug={tenantSlug}/>
    <section className="section card noticeBox"><strong>หลักการดึงมิเตอร์</strong><p className="muted">มิเตอร์ในหน้าทำบิลใช้เลขครั้งก่อนเป็นฐาน เจ้าบ้านกรอกเลขครั้งนี้เองได้ แต่ระบบไม่ยอมให้ต่ำกว่าครั้งก่อน</p></section>
  </AdminShell>
}
