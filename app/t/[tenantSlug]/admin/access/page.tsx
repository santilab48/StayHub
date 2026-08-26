import { tenantRoutes } from '../../../../../lib/routes'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  const cards=[
    ['⚡','ออกสิทธิ์ NFC',r.adminAccessIssue,'เจ้าของสร้างสิทธิ์ใหม่ให้ผู้พัก / พนักงาน / รถ'],
    ['👥','ผู้ถือสิทธิ์',r.adminAccessHolders,'ผู้เช่าหลัก ผู้พักเพิ่ม พนักงาน แขก ช่าง'],
    ['🚪','พื้นที่เข้าออก',r.adminAccessZones,'ประตูหลัก อาคาร ชั้น ที่จอดรถ พื้นที่ส่วนกลาง'],
    ['📡','เครื่องอ่าน',r.adminAccessReaders,'Reader / Controller / สถานะออนไลน์'],
    ['📱','Credential',r.adminAccessCredentials,'NFC มือถือ Wallet NFC บัตรจริง QR สำรอง'],
    ['🧾','ประวัติการเข้าออก',r.adminAccessLogs,'Granted / Denied / Revoked พร้อมเวลาและจุดอ่าน'],
    ['💰','สินค้า Access',r.adminAccessProducts,'ผู้พักเพิ่ม เครื่องเพิ่ม ที่จอดรถ บัตรทดแทน'],
    ['🔌','ผู้ให้บริการ NFC',r.adminAccessProvider,'เชื่อมระบบฮาร์ดแวร์โดยเก็บ secret นอกฐานข้อมูลหลัก']
  ]
  return <main className="wrap"><div className="toolbar"><div><a href={r.admin}>← จัดการหอ</a><span className="pill">Standalone Module</span><h1>NFC Access Control</h1><p className="lead">ระบบกุญแจดิจิทัลแยกจาก ห้อง / บิล / ซ่อม / บริการ เจ้าของหอเป็นผู้สร้างและยกเลิกสิทธิ์</p></div><a className="btn" href={r.adminAccessIssue}>+ ออกสิทธิ์ NFC</a></div><div className="metricGrid"><div className="metric"><span className="muted">Credential ใช้งาน</span><strong>—</strong></div><div className="metric"><span className="muted">ผู้ถือสิทธิ์</span><strong>—</strong></div><div className="metric"><span className="muted">Reader Online</span><strong>—</strong></div><div className="metric"><span className="muted">Denied วันนี้</span><strong>—</strong></div></div><section className="section"><h2>จัดการ Access</h2><div className="grid">{cards.map(([icon,title,href,desc])=><a key={href} href={href} className="card tile"><span className="icon">{icon}</span><div><h3>{title}</h3><p className="muted">{desc}</p></div></a>)}</div></section><section className="section card"><strong>หลักการความปลอดภัย</strong><p className="muted">StayHub เก็บสิทธิ์และสถานะ credential แต่ไม่เก็บ private NFC key แบบ plaintext การ provision จริงต้องผ่าน adapter ของผู้ผลิต Reader/Wallet ที่รองรับ และทุกการออก/ยกเลิกสิทธิ์มี audit event</p></section></main>}
