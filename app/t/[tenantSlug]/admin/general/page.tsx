import AdminShell from '../../../../../components/AdminShell'
import { tenantRoutes } from '../../../../../lib/routes'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  const items=[
    ['🔐','เจน NFC / Access',r.adminAccess,'ออกสิทธิ์ให้ผู้เช่ารายใหม่ เพิ่มผู้พักร่วม รถ หรือเพิกถอนสิทธิ์'],
    ['🏢','ห้องและข้อมูลต้นทาง',r.adminRooms,'ข้อมูลห้อง ที่อยู่ Wi-Fi การรับมอบ และสถานะย้ายออก'],
    ['📷','มิเตอร์',r.adminMeters,'สแกน/จดมิเตอร์ ตรวจค่า OCR และยืนยันค่าก่อนเข้าบิล'],
    ['🔧','แจ้งซ่อม',r.adminRepairs,'ดูและจัดการงานซ่อมทั้งหมด'],
    ['📦','พัสดุ',r.adminParcels,'รับพัสดุ ถ่ายรูป และติดตามการรับของ'],
    ['🚕','รถรับจ้าง',r.adminRides,'จัดการผู้ให้บริการและคำขอ'],
    ['📢','ประกาศ',r.adminNews,'ส่งประกาศทั้งหมด/อาคาร/ชั้น/ห้อง'],
    ['📊','รายงาน',r.adminReports,'รายงานที่ไม่ใช่งานประจำวัน'],
    ['⚙️','ตั้งค่าระบบ',r.adminSettings,'ค่าทั่วไปของหอและการเชื่อมระบบ']
  ]
  return <AdminShell slug={tenantSlug} title="ทั่วไป">
    <section className="card"><h2>เครื่องมืออื่นของเจ้าของหอ</h2><p className="muted">รวมงานที่ไม่ควรแย่งพื้นที่จาก 4 แท็บหลัก หากภายหลังมีฟังก์ชันใหม่ที่ไม่เข้าหมวด ให้เข้าที่นี่ก่อน</p></section>
    <section className="section grid">{items.map(([icon,title,href,detail])=><a className="card tile" href={href} key={title}><span className="icon">{icon}</span><div><h3>{title}</h3><p className="muted">{detail}</p></div></a>)}</section>
  </AdminShell>
}
