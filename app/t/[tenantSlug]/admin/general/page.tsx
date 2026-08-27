import AdminShell from '../../../../../components/AdminShell'
import GeneralRoomContextSelector from '../../../../../components/GeneralRoomContextSelector'
import GeneralRoomCountForm from '../../../../../components/GeneralRoomCountForm'
import ServiceContactSettingsForm from '../../../../../components/ServiceContactSettingsForm'
import RepairBacklogPanel from '../../../../../components/RepairBacklogPanel'
import GeneralAnnouncementComposer from '../../../../../components/GeneralAnnouncementComposer'
import TenantRentalSelector from '../../../../../components/TenantRentalSelector'
import { tenantRoutes } from '../../../../../lib/routes'

export default async function Page({params,searchParams}:{params:Promise<{tenantSlug:string}>,searchParams:Promise<{room_id?:string}>}){
  const {tenantSlug}=await params
  const {room_id:roomId}=await searchParams
  const r=tenantRoutes(tenantSlug)
  const withRoom=(href:string)=>roomId?`${href}?room_id=${encodeURIComponent(roomId)}`:href

  const roomItems=[
    ['🔐','NFC / Access',withRoom(r.adminAccessIssue),'สร้างสิทธิ์แล้วผูกห้องที่เลือกทันที'],
    ['🏠','ข้อมูลห้องของฉัน',withRoom(r.adminRoomSource),'Wi‑Fi ที่อยู่ เบอร์โทร รับมอบห้อง และทรัพย์สิน'],
    ['📷','มิเตอร์',withRoom(r.adminMeters),'จดหรือสแกนค่าของห้องที่เลือก'],
    ['🔧','งานซ่อม',withRoom(r.adminRepairs),'ดูงานซ่อมของห้องที่เลือก'],
    ['📦','พัสดุ',withRoom(r.adminParcels),'รับและติดตามพัสดุของห้องที่เลือก'],
    ['🚕','รถรับจ้าง',withRoom(r.adminRides),'จัดการคำขอของห้องที่เลือก']
  ]
  const systemItems=[
    ['📢','ประกาศ',r.adminNews,'ประกาศระดับหอหรือผู้พัก'],
    ['📊','รายงาน',r.adminReports,'รายงานรวมของหอ'],
    ['⚙️','ตั้งค่าระบบ',r.adminSettings,'ค่าทั่วไปและการเชื่อมระบบ']
  ]

  return <AdminShell slug={tenantSlug} title="ทั่วไป">
    <section className="card"><h2>จัดการจากห้องเดียว</h2><p className="muted">เลือก “ห้องที่กำลังจัดการ” ก่อน ทุกการสร้างหรือบันทึกด้านล่างจะส่ง room_id ห้องเดียวกันไปต่อ ไม่เลือกห้องซ้ำระหว่างทาง</p></section>

    <GeneralRoomContextSelector/>

    <section className="section"><h2>ข้อมูลและงานของห้องที่เลือก</h2><div className="grid">{roomItems.map(([icon,title,href,detail])=><a className="card tile" href={href} key={title}><span className="icon">{icon}</span><div><h3>{title}</h3><p className="muted">{detail}</p></div></a>)}</div></section>

    <RepairBacklogPanel/>
    <GeneralAnnouncementComposer/>

    <section className="section"><h2>ระบบระดับหอ</h2><div className="grid">{systemItems.map(([icon,title,href,detail])=><a className="card tile" href={href} key={title}><span className="icon">{icon}</span><div><h3>{title}</h3><p className="muted">{detail}</p></div></a>)}</div></section>

    <GeneralRoomCountForm/>
    <ServiceContactSettingsForm/>
    <TenantRentalSelector/>
  </AdminShell>
}
