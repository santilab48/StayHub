import TenantShell from '../../../../../components/TenantShell'
import RoomNav from '../../../../../components/RoomNav'
import { tenantRoutes } from '../../../../../lib/routes'

const Info=({label,value,owner=false}:{label:string,value:string,owner?:boolean})=><div className="infoRow"><span><span className="muted">{label}</span>{owner&&<small className="muted" style={{display:'block'}}>ข้อมูลยืนยันโดยเจ้าของ</small>}</span><strong>{value}</strong></div>

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  const roomNav=[
    ['ภาพรวมห้อง',r.room,'🏠','ข้อมูลห้อง + ติดต่อหอ + Wi‑Fi + ที่อยู่จัดส่ง'],
    ['สัญญาเช่า',r.contract,'✍️','อ่าน/เซ็น/ดาวน์โหลดสัญญา'],
    ['ผู้อยู่อาศัย',r.occupants,'👥','ผู้พักหลักและผู้พักร่วมที่อนุมัติแล้ว'],
    ['รถที่ลงทะเบียน',r.vehicles,'🚗','รถที่เจ้าของอนุมัติให้ผูกกับห้อง'],
    ['เอกสารห้อง',r.documents,'📄','เอกสารที่เจ้าของอนุญาตให้ดู']
  ]
  return <TenantShell slug={tenantSlug} title="ห้องของฉัน">
    <RoomNav slug={tenantSlug}/>
    <section className="roomHero card">
      <div><span className="eyebrow">MY ROOM</span><h2>ข้อมูลประจำห้องของฉัน</h2><p className="muted">ข้อมูลต้นทางมาจากหลังบ้านเจ้าของ หน้านี้ใช้ดูและเป็นทางลัด ไม่สร้างข้อมูลซ้ำกับบิล ซ่อม บริการ ข่าวสาร หรือ NFC Access</p></div>
      <span className="pill">เฉพาะห้องของฉัน</span>
    </section>

    <div className="metricGrid section">
      <div className="metric"><span className="muted">ห้อง</span><strong>—</strong><small>อาคาร / ชั้น / ห้อง</small></div>
      <div className="metric"><span className="muted">ค่าเช่าตามสัญญา</span><strong>—</strong><small>อ่านจากสัญญาที่ active</small></div>
      <div className="metric"><span className="muted">สัญญาสิ้นสุด</span><strong>—</strong><small>พร้อมแจ้งเตือนต่ออายุ</small></div>
      <div className="metric"><span className="muted">พัสดุรอรับ</span><strong>—</strong><small>ดูรายละเอียดในบริการ</small></div>
    </div>

    <section className="section"><h2>ไปส่วนไหน</h2><div className="grid roomMenu">{roomNav.map(([title,href,icon,detail])=><a className="card tile" href={href} key={href}><span className="icon">{icon}</span><div><h3>{title}</h3><p className="muted">{detail}</p></div></a>)}</div></section>

    <section className="section splitGrid">
      <div className="card"><h3>ข้อมูลห้อง</h3><Info label="เลขห้อง" value="—" owner/><Info label="อาคาร" value="—" owner/><Info label="ชั้น" value="—" owner/><Info label="สถานะเข้าพัก" value="—" owner/></div>
      <div className="card"><h3>ผู้เช่าหลัก</h3><Info label="ชื่อผู้เช่า" value="—" owner/><Info label="เบอร์โทร" value="—" owner/><Info label="ผู้ติดต่อฉุกเฉิน" value="—" owner/><Info label="สถานะสัญญา" value="—" owner/></div>
    </section>

    <section className="section splitGrid">
      <div className="card"><h3>☎️ ติดต่อหอ</h3><Info label="สำนักงาน / เจ้าของ" value="—" owner/><Info label="รปภ." value="—" owner/><Info label="เบอร์ฉุกเฉิน" value="—" owner/><div className="section"><button className="btn secondary">โทรติดต่อหอ</button></div></div>
      <div className="card"><h3>📶 Wi‑Fi ห้อง</h3><Info label="ชื่อเครือข่าย" value="—" owner/><Info label="รหัสผ่าน" value="—" owner/><Info label="หมายเหตุการใช้งาน" value="—" owner/><div className="section"><button className="btn secondary">คัดลอกรหัส Wi‑Fi</button></div></div>
    </section>

    <section className="section card"><h3>📦 ที่อยู่จัดส่งพัสดุ</h3><p className="muted">เจ้าของกำหนดที่อยู่หลักของหอ ระบบประกอบชื่อผู้รับ อาคาร และเลขห้องให้อัตโนมัติ</p><div className="splitGrid"><div><Info label="ชื่อผู้รับ" value="—"/><Info label="เบอร์โทรผู้รับ" value="—"/></div><div><Info label="อาคาร / เลขห้อง" value="—" owner/><Info label="ที่อยู่หอ / รหัสไปรษณีย์" value="—" owner/></div></div><div className="section"><button className="btn secondary">คัดลอกที่อยู่จัดส่ง</button></div></section>

    <section className="section card"><div className="toolbar"><div><h3>พัสดุที่มาถึงแล้ว</h3><p className="muted">สรุปเฉพาะของห้องนี้ รายละเอียดจริงอยู่ในโมดูลบริการ</p></div><span className="pill warn">รอรับ — ชิ้น</span></div><Info label="พัสดุล่าสุด" value="—"/><Info label="บริษัทขนส่ง" value="—"/><Info label="มาถึงเมื่อ" value="—"/><div className="section"><a className="btn secondary" href={r.services}>ดูพัสดุทั้งหมด</a></div></section>

    <section className="section splitGrid">
      <div className="card"><h3>🗝️ ข้อมูลรับมอบห้อง</h3><Info label="วันที่เข้าอยู่" value="—" owner/><Info label="กุญแจที่รับ" value="—" owner/><Info label="บัตร / Key Card ที่รับ" value="—" owner/><Info label="สภาพห้องตอนรับมอบ" value="—" owner/></div>
      <div className="card"><h3>🚪 การย้ายออก</h3><Info label="วันสิ้นสุดตามสัญญา" value="—" owner/><Info label="แจ้งย้ายออกแล้ว" value="—" owner/><Info label="วันที่นัดตรวจห้อง" value="—" owner/><Info label="สถานะคืนห้อง" value="—" owner/></div>
    </section>

    <section className="section card"><div className="toolbar"><div><h3>🛏️ ทรัพย์สินประจำห้อง</h3><p className="muted">รายการตอนรับมอบ เช่น แอร์ เตียง ตู้ โต๊ะ ทีวี ตู้เย็น เจ้าของเป็นคนกำหนดและบันทึกสภาพ</p></div><a className="btn secondary" href={r.documents}>ดูรายการ / หลักฐาน</a></div><div className="splitGrid"><div><Info label="จำนวนรายการ" value="—" owner/><Info label="รายการผิดปกติ" value="—" owner/></div><div><Info label="ตรวจล่าสุด" value="—" owner/><Info label="ผู้ตรวจ" value="—" owner/></div></div></section>

    <section className="section card"><h3>สรุปสัญญาปัจจุบัน</h3><div className="splitGrid"><div><Info label="วันเริ่มสัญญา" value="—" owner/><Info label="วันสิ้นสุด" value="—" owner/></div><div><Info label="ค่าเช่ารายเดือน" value="—" owner/><Info label="เงินประกัน" value="—" owner/></div></div></section>

    <section className="section card noticeBox"><strong>ไม่เก็บข้อมูลซ้ำ</strong><p className="muted">ยอดเงินจริง → บิล & ชำระ · งานเสีย → แจ้งซ่อม · รูป/ประวัติพัสดุ → บริการ · ประกาศเฉพาะห้อง → ข่าวสาร · NFC/ประตู/ที่จอดรถ → Access Control ส่วนภาพรวมห้องแสดงเพียงข้อมูลอ้างอิงและสถานะสรุป</p></section>
  </TenantShell>
}
