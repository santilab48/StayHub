import TenantShell from '../../../../../components/TenantShell'
import RoomNav from '../../../../../components/RoomNav'
import MyRoomOverview from '../../../../../components/MyRoomOverview'
import MyRoomDocumentsCard from '../../../../../components/MyRoomDocumentsCard'
import MyRoomNfcCard from '../../../../../components/MyRoomNfcCard'
import MyRoomLatestBillCard from '../../../../../components/MyRoomLatestBillCard'
import { tenantRoutes } from '../../../../../lib/routes'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  const roomNav=[
    ['ภาพรวมห้อง',r.room,'🏠','ข้อมูลห้อง สัญญา พัสดุ Wi‑Fi และข้อมูลรับมอบ'],
    ['สัญญาเช่า',r.contract,'✍️','อ่าน เซ็น และเปิด PDF Final'],
    ['ผู้อยู่อาศัย',r.occupants,'👥','ผู้พักหลักและผู้พักร่วมที่ผูกกับห้อง'],
    ['รถที่ลงทะเบียน',r.vehicles,'🚗','รถที่อนุมัติและผูกกับห้อง'],
    ['NFC ของฉัน',r.myAccessKey,'📱','สิทธิ์เข้าออกที่เจ้าของออกให้'],
    ['เอกสารห้อง',r.documents,'📄','เอกสารและหลักฐานที่อนุญาตให้ดู']
  ]

  return <TenantShell slug={tenantSlug} title="ห้องของฉัน">
    <RoomNav slug={tenantSlug}/>
    <MyRoomOverview slug={tenantSlug}/>
    <MyRoomLatestBillCard slug={tenantSlug}/>
    <MyRoomDocumentsCard/>

    <section className="section"><h2>เมนูห้องของฉัน</h2><div className="grid roomMenu">{roomNav.map(([title,href,icon,detail])=><a className="card tile" href={href} key={href}><span className="icon">{icon}</span><div><h3>{title}</h3><p className="muted">{detail}</p></div></a>)}</div></section>

    <MyRoomNfcCard slug={tenantSlug}/>

    <section className="section card noticeBox"><strong>ข้อมูลแยกตามห้องและผู้เช่า</strong><p className="muted">ยอดเงินจริงอยู่ที่ บิล & ชำระ · งานเสียอยู่ที่ แจ้งซ่อม · การออกหรือเพิกถอน NFC ทำโดยเจ้าของหอ · หน้า “ห้องของฉัน” ใช้ active lease ของสมาชิกเป็นเส้นหลัก จึงไม่เลือกห้องของคนอื่นจากหน้าเว็บ</p></section>
  </TenantShell>
}
