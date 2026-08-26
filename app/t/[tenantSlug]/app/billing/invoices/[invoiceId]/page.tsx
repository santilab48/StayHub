import TenantShell from '../../../../../../../components/TenantShell'
import BillingNav from '../../../../../../../components/BillingNav'
import ResidentInvoiceDetail from '../../../../../../../components/ResidentInvoiceDetail'

export default async function Page({params}:{params:Promise<{tenantSlug:string;invoiceId:string}>}){
  const {tenantSlug,invoiceId}=await params
  return <TenantShell slug={tenantSlug} title="รายละเอียดบิล">
    <BillingNav slug={tenantSlug}/>
    <ResidentInvoiceDetail invoiceId={invoiceId}/>
    <section className="section card noticeBox"><strong>หลังส่งสลิป</strong><p className="muted">สถานะจะเป็น “รอตรวจ” จนกว่าเจ้าของกดรับชำระหรือปฏิเสธ ระบบฐานข้อมูลจะใช้ยอดจากบิลจริง ไม่เชื่อยอดที่ส่งจากหน้าเว็บ</p></section>
  </TenantShell>
}
