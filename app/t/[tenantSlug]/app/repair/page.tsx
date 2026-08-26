import TenantShell from '../../../../../components/TenantShell'
import { tenantRoutes } from '../../../../../lib/routes'

const Status=({label,active=false}:{label:string;active?:boolean})=><span className={active?'pill':'pill off'}>{label}</span>

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  return <TenantShell slug={tenantSlug} title="แจ้งซ่อม & บริการ">
    <section className="card">
      <div className="toolbar"><div><span className="eyebrow">REPAIR & SERVICES</span><h2>แจ้งซ่อมและบริการของหอ</h2><p className="muted">แจ้งซ่อม เรียกรถ ติดต่อบริการ และขอความช่วยเหลือจากหน้าเดียว</p></div><span className="pill">เฉพาะห้องของฉัน</span></div>
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
      <div className="toolbar"><div><h3>แจ้งซ่อม</h3><p className="muted">กรอกสั้น ๆ แล้วส่ง เจ้าของจะรับงานและนัดหมายภายหลัง</p></div><span className="pill">3 ขั้นตอน</span></div>
      <div className="formGrid">
        <label>หัวข้อที่เสีย<select><option>ไฟฟ้า</option><option>ประปา</option><option>แอร์</option><option>อินเทอร์เน็ต</option><option>ประตู / กุญแจ</option><option>เฟอร์นิเจอร์</option><option>ห้องน้ำ</option><option>อื่น ๆ</option></select></label>
        <label className="span2">รายละเอียด<textarea rows={3} placeholder="บอกอาการสั้น ๆ เช่น แอร์ไม่เย็นและมีน้ำหยด"/></label>
        <label className="span2">แนบภาพ<input type="file" accept="image/*" multiple/></label>
      </div>
      <div className="section"><button className="btn">ส่งแจ้งซ่อม</button></div>
    </section>

    <section className="section card">
      <h3>ช่วยเหลือ</h3>
      <div className="grid">
        <a className="card tile" href={r.services}><span className="icon">📦</span><div><h3>พัสดุ</h3><p className="muted">ดูพัสดุที่มาถึง รายการรอรับ และประวัติการรับของ</p></div></a>
        <a className="card tile" href="#lost-found"><span className="icon">🔎</span><div><h3>ของหาย / พบของ</h3><p className="muted">แจ้งรายละเอียด จุดที่หายหรือพบ และแนบรูปได้</p></div></a>
        <a className="card tile" href="#emergency"><span className="icon">🚨</span><div><h3>ฉุกเฉิน</h3><p className="muted">โทรหาเจ้าของ รปภ. หรือเบอร์ฉุกเฉินที่หอกำหนด</p></div></a>
        <a className="card tile" href="#request"><span className="icon">📝</span><div><h3>คำขอทั่วไป</h3><p className="muted">ขอเอกสาร เพิ่มกุญแจ ตรวจห้อง หรือเรื่องอื่นที่ไม่ใช่งานซ่อม</p></div></a>
      </div>
    </section>

    <section id="lost-found" className="section card">
      <div className="toolbar"><div><h3>ของหาย / พบของ</h3><p className="muted">เลือกประเภทแล้วกรอกสั้น ๆ</p></div><span className="pill">ส่งถึงเจ้าของ</span></div>
      <div className="formGrid"><label>ประเภท<select><option>ของหาย</option><option>พบของ</option></select></label><label className="span2">รายละเอียด<textarea rows={3} placeholder="ของอะไร หาย/พบที่ไหน เมื่อประมาณกี่โมง"/></label><label className="span2">แนบภาพ<input type="file" accept="image/*" multiple/></label></div>
      <div className="section"><button className="btn">ส่งข้อมูล</button></div>
    </section>

    <section id="request" className="section card">
      <div className="toolbar"><div><h3>คำขอทั่วไป</h3><p className="muted">สำหรับเรื่องที่ไม่เข้าหมวดซ่อมหรือบริการ</p></div><span className="pill">ติดตามสถานะได้</span></div>
      <div className="formGrid"><label>หัวข้อ<select><option>ขอเอกสาร</option><option>ขอเพิ่มกุญแจ / Key Card</option><option>ขอตรวจห้อง</option><option>ขอความช่วยเหลืออื่น</option></select></label><label className="span2">รายละเอียด<textarea rows={3} placeholder="ระบุสิ่งที่ต้องการ"/></label><label className="span2">แนบภาพ / เอกสาร<input type="file" multiple/></label></div>
      <div className="section"><button className="btn">ส่งคำขอ</button></div>
    </section>

    <section id="emergency" className="section card noticeBox"><div className="toolbar"><div><h3>🚨 ติดต่อฉุกเฉิน</h3><p className="muted">แสดงเบอร์ที่เจ้าของตั้งไว้ เช่น เจ้าของ รปภ. และเบอร์ฉุกเฉินของหอ</p></div><button className="btn">โทรฉุกเฉิน</button></div></section>

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
