import AdminShell from '../../../../../../components/AdminShell'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="สร้างและตั้งเวลาส่งบิล">
    <section className="card">
      <div className="toolbar"><div><h2>ทำบิลล่วงหน้าได้</h2><p className="muted">สร้างบิลไว้ก่อน แล้วกำหนดวัน/เวลาที่ต้องการให้ระบบส่ง LINE ถึงผู้เช่า</p></div><button className="btn">+ สร้างบิลใหม่</button></div>
    </section>

    <section className="section grid">
      <div className="card"><h3>1. เลือกห้อง</h3><p className="muted">เลือกห้องและสัญญาปัจจุบัน ระบบดึงค่าเช่าตามสัญญา</p></div>
      <div className="card"><h3>2. รายการค่าใช้จ่าย</h3><p className="muted">ค่าเช่า + ค่าน้ำ/ไฟจากมิเตอร์ที่ยืนยันแล้ว + ค่าใช้จ่ายอื่น</p></div>
      <div className="card"><h3>3. วันครบกำหนด</h3><p className="muted">กำหนด due_date สำหรับการชำระ</p></div>
      <div className="card"><h3>4. วันส่ง LINE</h3><p className="muted">กำหนด send_at แยกจากวันครบกำหนด เช่น ทำบิลวันที่ 25 ส่งวันที่ 28 ครบกำหนดวันที่ 5</p></div>
    </section>

    <section className="section card"><h3>สถานะบิลล่วงหน้า</h3><div className="infoRow"><span className="muted">ฉบับร่าง</span><strong>draft</strong></div><div className="infoRow"><span className="muted">ตั้งเวลาส่งแล้ว</span><strong>scheduled</strong></div><div className="infoRow"><span className="muted">เข้าคิว LINE</span><strong>queued</strong></div><div className="infoRow"><span className="muted">ส่งแล้ว</span><strong>sent</strong></div></section>

    <section className="section card noticeBox"><strong>LINE Card</strong><p className="muted">เมื่อถึง send_at ระบบจะสร้างงานใน notification_queue แล้วตัวส่ง Messaging API ส่ง Flex Message ไปยัง LINE user ของผู้เช่าห้องนั้น ปุ่ม “ดูรายละเอียดบิล” เปิดหน้ารายละเอียดของ invoice โดยตรง</p></section>
  </AdminShell>
}
