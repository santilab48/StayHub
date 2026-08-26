import TenantShell from '../../../../../components/TenantShell'
import RoomNav from '../../../../../components/RoomNav'
import { tenantRoutes } from '../../../../../lib/routes'

const Info=({label,value,owner=false}:{label:string,value:string,owner?:boolean})=><div className="infoRow"><span><span className="muted">{label}</span>{owner&&<small className="muted" style={{display:'block'}}>ข้อมูลยืนยันโดยเจ้าของ</small>}</span><strong>{value}</strong></div>

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  const roomNav=[
    ['ภาพรวมห้อง',r.room,'🏠','ข้อมูลห้อง + ผู้เช่าหลัก + ที่อยู่จัดส่ง'],
    ['สัญญาเช่า',r.contract,'✍️','อ่าน/เซ็น/ดาวน์โหลดสัญญา'],
    ['ผู้อยู่อาศัย',r.occupants,'👥','ผู้พักหลักและผู้พักร่วมที่อนุมัติแล้ว'],
    ['รถที่ลงทะเบียน',r.vehicles,'🚗','รถที่เจ้าของอนุมัติให้ผูกกับห้อง'],
    ['เอกสารห้อง',r.documents,'📄','เอกสารที่เจ้าของอนุญาตให้ดู']
  ]
  return <TenantShell slug={tenantSlug} title="ห้องของฉัน">
    <RoomNav slug={tenantSlug}/>
    <section className="roomHero card">
      <div><span className="eyebrow">MY ROOM</span><h2>ข้อมูลประจำห้องของฉัน</h2><p className="muted">หน้านี้อ่านข้อมูลจากหลังบ้านเจ้าของ ไม่สร้างข้อมูลซ้ำกับบิล แจ้งซ่อม บริการ ข่าวสาร หรือ NFC Access</p></div>
      <span className="pill">เฉพาะห้องของฉัน</span>
    </section>

    <div className="metricGrid section">
      <div className="metric"><span className="muted">ห้อง</span><strong>—</strong><small>เจ้าของกำหนด อาคาร / ชั้น / ห้อง</small></div>
      <div className="metric"><span className="muted">ค่าเช่าตามสัญญา</span><strong>—</strong><small>อ่านจากสัญญาที่ active</small></div>
      <div className="metric"><span className="muted">สัญญาสิ้นสุด</span><strong>—</strong><small>อ่านจากสัญญาปัจจุบัน</small></div>
      <div className="metric"><span className="muted">เงินประกัน</span><strong>—</strong><small>ยอดอ้างอิงจากสัญญา</small></div>
    </div>

    <section className="section">
      <h2>ไปส่วนไหน</h2>
      <div className="grid roomMenu">{roomNav.map(([title,href,icon,detail])=><a className="card tile" href={href} key={href}><span className="icon">{icon}</span><div><h3>{title}</h3><p className="muted">{detail}</p></div></a>)}</div>
    </section>

    <section className="section splitGrid">
      <div className="card"><h3>ข้อมูลห้อง</h3><Info label="เลขห้อง" value="—" owner/><Info label="อาคาร" value="—" owner/><Info label="ชั้น" value="—" owner/><Info label="สถานะเข้าพัก" value="—" owner/></div>
      <div className="card"><h3>ผู้เช่าหลัก</h3><Info label="ชื่อผู้เช่า" value="—" owner/><Info label="เบอร์โทร" value="—" owner/><Info label="ผู้ติดต่อฉุกเฉิน" value="—" owner/><Info label="สถานะสัญญา" value="—" owner/></div>
    </section>

    <section className="section card"><h3>ที่อยู่จัดส่งพัสดุ</h3><p className="muted">ใช้เป็นที่อยู่มาตรฐานสำหรับส่งของเข้าหอ เจ้าของกำหนดข้อมูลหลักจากหลังบ้าน แล้วระบบประกอบเลขห้องของผู้เช่าให้อัตโนมัติ</p><div className="splitGrid"><div><Info label="ชื่อผู้รับ" value="—"/><Info label="เบอร์โทรผู้รับ" value="—"/></div><div><Info label="อาคาร / เลขห้อง" value="—" owner/><Info label="ที่อยู่หอ / รหัสไปรษณีย์" value="—" owner/></div></div><div className="section"><button className="btn secondary">คัดลอกที่อยู่จัดส่ง</button></div></section>

    <section className="section card">
      <div className="toolbar"><div><h3>พัสดุที่มาถึงแล้ว</h3><p className="muted">แสดงเฉพาะสรุปพัสดุของห้องนี้ รายละเอียดทั้งหมดเก็บในโมดูลบริการ</p></div><span className="pill warn">รอรับ — ชิ้น</span></div>
      <div className="infoRow"><span className="muted">พัสดุล่าสุด</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">บริษัทขนส่ง</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">มาถึงเมื่อ</span><strong>—</strong></div>
      <div className="section"><a className="btn secondary" href={r.services}>ดูพัสดุทั้งหมด</a></div>
    </section>

    <section className="section card"><h3>สรุปสัญญาปัจจุบัน</h3><div className="splitGrid"><div><Info label="วันเริ่มสัญญา" value="—" owner/><Info label="วันสิ้นสุด" value="—" owner/></div><div><Info label="ค่าเช่ารายเดือน" value="—" owner/><Info label="เงินประกัน" value="—" owner/></div></div></section>

    <section className="section card noticeBox"><strong>แยกจากโมดูลอื่น</strong><p className="muted">ภาพรวมห้องแสดงเฉพาะ “จำนวนพัสดุรอรับ + พัสดุล่าสุด” เพื่อให้เห็นทันที ส่วนรูปพัสดุ ประวัติ การยืนยันรับ และรายการทั้งหมดอยู่ใน “บริการ” · บิล/สลิป/ใบเสร็จ → “บิล & ชำระ” · งานเสีย → “แจ้งซ่อม” · ประกาศ → “ข่าวสาร” · กุญแจ NFC/ประตู/ที่จอดรถ → “Access Control” แยกต่างหาก</p></section>
  </TenantShell>
}
