import AdminShell from '../../../../../components/AdminShell'

const Row=({label,value}:{label:string,value:string})=><div className="infoRow"><span className="muted">{label}</span><strong>{value}</strong></div>

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="สัญญา">
    <section className="card"><div className="toolbar"><div><h2>สัญญาเช่าทุกห้อง</h2><p className="muted">เลือกห้องแล้วเห็นข้อมูลผู้เช่า รถ เงินประกัน และสัญญาปัจจุบันในจุดเดียว</p></div><button className="btn">+ สร้างสัญญาใหม่</button></div></section>
    <section className="section splitGrid">
      <div className="card"><h3>เลือกห้อง</h3><label>ห้อง<select><option>เลือกห้อง</option></select></label><Row label="ชื่อผู้เช่า" value="—"/><Row label="เบอร์โทร" value="—"/><Row label="ทะเบียนรถ" value="—"/><Row label="เงินประกัน" value="— บาท"/><Row label="สถานะสัญญา" value="—"/></div>
      <div className="card"><h3>สัญญาปัจจุบัน</h3><Row label="วันเริ่ม" value="—"/><Row label="วันสิ้นสุด" value="—"/><Row label="ค่าเช่า" value="— บาท"/><Row label="เงินประกัน" value="— บาท"/><Row label="ฉบับ" value="—"/><Row label="สถานะลายเซ็น" value="—"/></div>
    </section>
    <section className="section card"><h3>สร้างสัญญา Paperless</h3><div className="formGrid"><label>ชื่อผู้ให้เช่า<input placeholder="ชื่อเจ้าของ/ผู้มีอำนาจ"/></label><label>ชื่อผู้เช่า<input placeholder="ดึงจากผู้เช่าหรือแก้ก่อนสร้าง"/></label><label>เลขห้อง<input/></label><label>ทะเบียนรถ<input/></label><label>ค่าเช่าต่อเดือน<input type="number"/></label><label>เงินประกัน<input type="number"/></label><label>วันเริ่มสัญญา<input type="date"/></label><label>วันสิ้นสุดสัญญา<input type="date"/></label><label className="span2">เงื่อนไขเพิ่มเติม<textarea placeholder="เงื่อนไขเฉพาะของหอ"/></label></div><div className="section flow"><button className="btn">สร้างร่างสัญญา</button><button className="btn secondary">ดูตัวอย่างก่อนส่งเซ็น</button></div></section>
    <section className="section splitGrid"><div className="card"><h3>ลายเซ็นผู้เช่า</h3><div style={{minHeight:160,border:'1px dashed #bbb',borderRadius:12,padding:16}}><span className="muted">พื้นที่เซ็นบนหน้าจอ</span></div><button className="btn secondary section">บันทึกลายเซ็นผู้เช่า</button></div><div className="card"><h3>ลายเซ็นเจ้าของ</h3><div style={{minHeight:160,border:'1px dashed #bbb',borderRadius:12,padding:16}}><span className="muted">พื้นที่เซ็นบนหน้าจอ</span></div><button className="btn secondary section">บันทึกลายเซ็นเจ้าของ</button></div></section>
    <section className="section card noticeBox"><strong>เมื่อเซ็นครบ</strong><p className="muted">ล็อก snapshot ของสัญญา + timestamp + audit → สร้าง PDF ฉบับสุดท้าย → ผู้เช่าเปิดดู/ดาวน์โหลดจาก “ห้องของฉัน” ได้ และห้ามแก้ฉบับที่เซ็นแล้วโดยตรง</p></section>
  </AdminShell>
}
