import AdminShell from '../../../../../../components/AdminShell'
import FinanceTabs from '../../../../../../components/FinanceTabs'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="การเงิน">
    <FinanceTabs slug={tenantSlug}/>
    <section className="card section">
      <div className="toolbar"><div><h2>สลิปรอตรวจ</h2><p className="muted">ผู้เช่าส่งสลิปจากหน้าบิลโดยตรง ระบบเก็บเป็น payment สถานะ pending จนกว่าเจ้าของจะกดรับหรือปฏิเสธ</p></div><span className="pill warn">รอตรวจ — รายการ</span></div>
    </section>
    <section className="section card"><h3>ข้อมูลก่อนรับชำระ</h3><div className="infoRow"><span className="muted">ห้อง</span><strong>—</strong></div><div className="infoRow"><span className="muted">รอบบิล</span><strong>—</strong></div><div className="infoRow"><span className="muted">ยอดตามบิล</span><strong>— บาท</strong></div><div className="infoRow"><span className="muted">ยอดที่ผู้เช่าแจ้ง</span><strong>— บาท</strong></div><div className="section card"><strong>รูปสลิป</strong><p className="muted">โหลดจาก stayhub-payments หลังตรวจสิทธิ์ tenant</p></div><div className="flow section"><button className="btn">รับชำระ</button><button className="btn secondary">ปฏิเสธ</button></div></section>
  </AdminShell>
}
