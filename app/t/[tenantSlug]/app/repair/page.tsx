import TenantShell from '../../../../../components/TenantShell'

const Status=({label,active=false}:{label:string;active?:boolean})=><span className={active?'pill':'pill off'}>{label}</span>

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <TenantShell slug={tenantSlug} title="แจ้งซ่อม & บริการ">
    <section className="card">
      <div className="toolbar"><div><span className="eyebrow">REPAIR & SERVICES</span><h2>แจ้งซ่อมและบริการของหอ</h2><p className="muted">แจ้งซ่อม เรียกรถ ติดต่อบริการ และติดตามนัดหมายในหน้าเดียว</p></div><span className="pill">เฉพาะห้องของฉัน</span></div>
    </section>

    <section className="section card">
      <h3>บริการด่วน</h3>
      <div className="grid">
        <a className="card tile" href="#moving"><span className="icon">🚚</span><div><h3>รถขนของ</h3><p className="muted">ชื่อบริการและเบอร์โทรกำหนดโดยเจ้าของหอ</p></div></a>
        <a className="card tile" href="#win"><span className="icon">🏍️</span><div><h3>เรียกวิน</h3><p className="muted">ชื่อวินและเบอร์โทรกำหนดโดยเจ้าของหอ</p></div></a>
        <a className="card tile" href="https://www.grab.com/th/" target="_blank" rel="noreferrer"><span className="icon">🚕</span><div><h3>เรียก Grab</h3><p className="muted">เปิด Grab โดยตรง ไม่ใช้เบอร์ที่เจ้าของตั้ง</p></div></a>
        <a className="card tile" href="#owner"><span className="icon">☎️</span><div><h3>ติดต่อเจ้าของ</h3><p className="muted">หัวข้อและเบอร์โทรกำหนดโดยเจ้าของหอ</p></div></a>
      </div>
    </section>

    <section className="section card">
      <h3>แจ้งซ่อมใหม่</h3>
      <div className="formGrid">
        <label>ประเภทปัญหา<select><option>ไฟฟ้า</option><option>ประปา</option><option>แอร์</option><option>อินเทอร์เน็ต</option><option>ประตู / กุญแจ</option><option>เฟอร์นิเจอร์</option><option>ห้องน้ำ</option><option>อื่น ๆ</option></select></label>
        <label>ความเร่งด่วน<select><option>ปกติ</option><option>เร่งด่วน</option></select></label>
        <label className="span2">รายละเอียด<textarea rows={4} placeholder="เช่น แอร์ไม่เย็น มีน้ำหยดจากเครื่อง ตั้งแต่เมื่อคืน"/></label>
        <label>วัน/เวลาที่สะดวก<input type="datetime-local"/></label>
        <label>เข้าห้องได้เมื่อไม่อยู่หรือไม่<select><option>ต้องมีผู้เช่าอยู่</option><option>อนุญาตให้เจ้าหน้าที่เข้าซ่อมได้</option></select></label>
        <label className="span2">รูปประกอบ<input type="file" accept="image/*" multiple/></label>
      </div>
      <div className="section"><button className="btn">ส่งเรื่องซ่อม</button></div>
    </section>

    <section className="section card">
      <div className="toolbar"><div><h3>ยืนยันเวลานัดผ่าน LINE</h3><p className="muted">เมื่อเจ้าของกำหนดเวลานัด ระบบส่งการ์ด LINE ให้ผู้เช่าเลือก “ยืนยัน” หรือ “แก้ไข”</p></div><span className="pill warn">รอยืนยัน</span></div>
      <div className="infoRow"><span className="muted">วัน/เวลานัด</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">งาน / บริการ</span><strong>—</strong></div>
      <div className="flow section"><button className="btn">ยืนยันนัด</button><button className="btn secondary">แก้ไขวัน/เวลา</button></div>
      <p className="muted">หากแก้ไข ระบบเปิดฟอร์มวัน/เวลาเดิม บันทึกค่าที่แก้ แล้วส่งการ์ด LINE ฉบับอัปเดตกลับมาอีกครั้งจนกว่าจะยืนยัน</p>
    </section>

    <section className="section card">
      <div className="toolbar"><div><h3>งานที่กำลังดำเนินการ</h3><p className="muted">เจ้าของเปลี่ยนสถานะแล้วผู้เช่าเห็นความคืบหน้าตรงนี้</p></div><span className="pill warn">— งาน</span></div>
      <div className="flow section"><Status label="ส่งเรื่อง" active/><span>→</span><Status label="รับงาน"/><span>→</span><Status label="นัดหมาย"/><span>→</span><Status label="กำลังซ่อม"/><span>→</span><Status label="เสร็จแล้ว"/></div>
      <div className="infoRow"><span className="muted">รายการล่าสุด</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">ช่าง / ผู้รับผิดชอบ</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">เวลานัด</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">หมายเหตุจากเจ้าของ</span><strong>—</strong></div>
    </section>

    <section className="section card"><div className="toolbar"><div><h3>ประวัติ</h3><p className="muted">เก็บงานซ่อมและคำขอบริการเดิมไว้ ไม่ลบเมื่อปิดงาน</p></div><button className="btn secondary">ดูประวัติทั้งหมด</button></div></section>
  </TenantShell>
}
