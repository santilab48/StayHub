import AdminShell from '../../../../../components/AdminShell'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="งานซ่อม">
    <div className="metricGrid">
      <div className="metric"><span className="muted">งานใหม่</span><strong>—</strong></div>
      <div className="metric"><span className="muted">รับงานแล้ว</span><strong>—</strong></div>
      <div className="metric"><span className="muted">กำลังซ่อม</span><strong>—</strong></div>
      <div className="metric"><span className="muted">เร่งด่วน</span><strong>—</strong></div>
    </div>

    <section className="section card">
      <div className="toolbar"><div><h2>คิวงานซ่อม</h2><p className="muted">งานใหม่จากผู้เช่าจะขึ้นหน้า “สิ่งที่ต้องทำ” และเข้าคิวนี้อัตโนมัติ</p></div><div className="flow"><button className="btn secondary">กรองสถานะ</button><button className="btn secondary">กรองห้อง</button></div></div>
      <div className="infoRow"><span className="muted">ห้อง / ผู้เช่า</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">ประเภท / รายละเอียด</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">ความเร่งด่วน</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">เวลาที่สะดวก</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">สิทธิ์เข้าห้อง</span><strong>—</strong></div>
      <div className="section card"><strong>รูปประกอบ</strong><p className="muted">รูปจากผู้เช่าจะแสดงตรงนี้หลังตรวจสิทธิ์ tenant</p></div>
      <div className="flow section"><button className="btn">รับงาน</button><button className="btn secondary">นัดหมาย</button><button className="btn secondary">เริ่มซ่อม</button><button className="btn secondary">ปิดงาน</button></div>
    </section>

    <section className="section card"><h3>บันทึกงาน</h3><div className="formGrid"><label>ผู้รับผิดชอบ<input placeholder="ชื่อช่าง / พนักงาน"/></label><label>วันเวลานัด<input type="datetime-local"/></label><label className="span2">หมายเหตุถึงผู้เช่า<textarea rows={3} placeholder="เช่น ช่างจะเข้าตรวจช่วง 18:30 น."/></label></div></section>

    <section className="section card noticeBox"><strong>สถานะมาตรฐาน</strong><p className="muted">submitted → accepted → scheduled → in_progress → completed / cancelled ทุกการเปลี่ยนสถานะเก็บเป็น timeline และพร้อมส่ง LINE notification ภายหลัง</p></section>
  </AdminShell>
}
