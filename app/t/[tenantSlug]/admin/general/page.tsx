import AdminShell from '../../../../../components/AdminShell'
import GeneralRoomContextSelector from '../../../../../components/GeneralRoomContextSelector'
import RoomTenantAssignmentForm from '../../../../../components/RoomTenantAssignmentForm'
import RoomOwnerSourceForm from '../../../../../components/RoomOwnerSourceForm'
import RoomDisplayDocumentsForm from '../../../../../components/RoomDisplayDocumentsForm'
import NfcIssueForm from '../../../../../components/NfcIssueForm'
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
    ['📷','มิเตอร์',withRoom(r.adminMeters),'จดหรือสแกนค่าของห้องที่เลือก'],
    ['🔧','งานซ่อม',withRoom(r.adminRepairs),'ดูและจัดการงานซ่อมของห้องที่เลือก'],
    ['📦','พัสดุ',withRoom(r.adminParcels),'รับและติดตามพัสดุของห้องที่เลือก'],
    ['🚕','รถรับจ้าง',withRoom(r.adminRides),'จัดการคำขอของห้องที่เลือก'],
    ['👥','ผู้พัก',withRoom(r.adminRoomOccupancy),'จัดการผู้พักหลักและผู้พักร่วมของห้อง'],
    ['🚗','รถของห้อง',withRoom(r.adminRoomVehicles),'ทะเบียนรถของผู้พักในห้องนี้'],
    ['📘','กฎ/เอกสารห้อง',withRoom(r.adminRoomDocuments),'ดูเอกสารของห้องที่เลือก'],
    ['📄','สัญญา',withRoom(r.adminContracts),'สัญญาของผู้เช่าห้องที่เลือก']
  ]
  const systemItems=[
    ['📢','ประกาศ',r.adminNews,'ประกาศระดับหอหรือผู้พัก'],
    ['📊','รายงาน',r.adminReports,'รายงานรวมของหอ'],
    ['⚙️','ตั้งค่าระบบ',r.adminSettings,'ค่าทั่วไปและการเชื่อมระบบ']
  ]

  return <AdminShell slug={tenantSlug} title="ทั่วไป">
    <section className="card"><h2>เริ่มจากตั้งค่าห้อง</h2><p className="muted">กำหนดจำนวนห้องและรูปแบบเลขห้องก่อน จากนั้นเลือกห้องครั้งเดียว ทุกข้อมูลด้านล่างจะใช้ room_id เดียวกัน</p></section>

    <GeneralRoomCountForm/>

    <GeneralRoomContextSelector/>

    <section className="section card noticeBox"><strong>กำลังแก้ข้อมูลของห้องที่เลือก</strong><p className="muted">เลือกห้องครั้งเดียว แล้วข้อมูลผู้เช่า รายละเอียดห้อง สัญญา กฎระเบียบ NFC และงานอื่นจะผูก room_id ห้องนี้ต่อเนื่อง</p></section>

    <RoomTenantAssignmentForm/>
    <RoomOwnerSourceForm slug={tenantSlug}/>

    <RoomDisplayDocumentsForm mode="all"/>

    <NfcIssueForm/>

    <section className="section"><h2>งานอื่นของห้องที่เลือก</h2><div className="grid">{roomItems.map(([icon,title,href,detail])=><a className="card tile" href={href} key={title}><span className="icon">{icon}</span><div><h3>{title}</h3><p className="muted">{detail}</p></div></a>)}</div></section>

    <RepairBacklogPanel/>
    <GeneralAnnouncementComposer/>

    <section className="section"><h2>ระบบระดับหอ</h2><div className="grid">{systemItems.map(([icon,title,href,detail])=><a className="card tile" href={href} key={title}><span className="icon">{icon}</span><div><h3>{title}</h3><p className="muted">{detail}</p></div></a>)}</div></section>

    <ServiceContactSettingsForm/>
    <TenantRentalSelector/>
  </AdminShell>
}
