import AdminShell from '../../../../../../components/AdminShell'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="ตรวจสลิป">
    <section className="card">
      <div className="toolbar"><div><h2>สลิปรอตรวจ</h2><p className="muted">ผู้เช่าส่งสลิปจากหน้าบิลโดยตรง ระบบเก็บเป็น payment สถานะ pending จนกว่าเจ้าของจะกดรับหรือปฏิเสธ</p></div><span className="pill warn">รอตรวจ — รายการ</span></div>
    </section>

    <section className="section card">
      <h3>ข้อมูลที่เจ้าของต้องเห็นก่อนตัดสินใจ</h3>
      <div className="infoRow"><span className="muted">ห้อง</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">รอบบิล</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">ยอดตามบิล</span><strong>— บาท</strong></div>
      <div className="infoRow"><span className="muted">ยอดที่ผู้เช่าแจ้ง</span><strong>— บาท</strong></div>
      <div className="infoRow"><span className="muted">ส่งเมื่อ</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">หมายเหตุผู้เช่า</span><strong>—</strong></div>
      <div className="section card"><strong>รูปสลิป</strong><p className="muted">โหลดจาก stayhub-payments ด้วย signed URL หลังตรวจสิทธิ์ tenant</p></div>
      <div className="flow section"><button className="btn">รับชำระ</button><button className="btn secondary">ปฏิเสธ</button></div>
    </section>

    <section className="section card noticeBox"><strong>กติกา</strong><p className="muted">กด “รับชำระ” → approve payment → เปลี่ยนสถานะบิลตามยอดที่ได้รับ → ออก receipt · กด “ปฏิเสธ” → บันทึกเหตุผล → ผู้เช่าส่งสลิปใหม่ได้</p></section>
  </AdminShell>
}
