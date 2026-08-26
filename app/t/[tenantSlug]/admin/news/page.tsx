import AdminShell from '../../../../../components/AdminShell'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="ประกาศ">
    <section className="card"><div className="toolbar"><div><span className="eyebrow">ANNOUNCEMENT</span><h2>สร้างประกาศ</h2><p className="muted">เลือกผู้รับได้ ไม่จำเป็นต้องส่งทั้งหอทุกครั้ง</p></div><span className="pill">Owner / Admin</span></div></section>

    <section className="section card">
      <div className="formGrid">
        <label>หัวข้อ<input placeholder="เช่น งดใช้น้ำชั่วคราว"/></label>
        <label>ประเภท<select><option>ทั่วไป</option><option>น้ำ / ไฟ</option><option>ซ่อมส่วนกลาง</option><option>กฎ / แจ้งเตือน</option><option>กิจกรรม</option><option>อื่น ๆ</option></select></label>
        <label className="span2">รายละเอียด<textarea rows={4} placeholder="รายละเอียดประกาศ"/></label>
        <label>ส่งถึง<select><option>ทั้งหอ</option><option>อาคาร</option><option>ชั้น</option><option>ห้องเฉพาะ</option></select></label>
        <label>อาคาร / ชั้น / ห้อง<input placeholder="เลือกตามกลุ่มผู้รับ"/></label>
        <label>วันเผยแพร่<input type="datetime-local"/></label>
        <label>วันหมดอายุ<input type="datetime-local"/></label>
        <label><input type="checkbox"/> ปักหมุดประกาศสำคัญ</label>
        <label><input type="checkbox"/> ส่ง LINE Card ด้วย</label>
        <label className="span2">รูป / ไฟล์แนบ<input type="file" multiple/></label>
      </div>
      <div className="section"><button className="btn">บันทึกและเผยแพร่</button></div>
    </section>

    <section className="section card"><div className="toolbar"><div><h3>ประกาศที่ส่งแล้ว</h3><p className="muted">ดูย้อนหลัง แก้ฉบับร่าง หรือหยุดแสดงประกาศที่หมดความจำเป็นได้</p></div><button className="btn secondary">ดูทั้งหมด</button></div></section>

    <section className="section card noticeBox"><strong>การส่ง LINE</strong><p className="muted">ถ้าเลือกส่ง LINE ระบบจะเข้าคิวเฉพาะผู้เช่าที่ตรงกับกลุ่มผู้รับเดียวกับประกาศ และการ์ดจะมีปุ่มเปิดรายละเอียดประกาศนี้โดยตรง</p></section>
  </AdminShell>
}
