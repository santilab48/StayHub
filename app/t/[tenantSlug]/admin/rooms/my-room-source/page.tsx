import AdminShell from '../../../../../../components/AdminShell'
import RoomOwnerSourceForm from '../../../../../../components/RoomOwnerSourceForm'
import { tenantRoutes } from '../../../../../../lib/routes'

const Row=({label,source,target}:{label:string,source:string,target:string})=><div className="infoRow"><span><strong>{label}</strong><small className="muted" style={{display:'block'}}>{source}</small></span><span className="pill">{target}</span></div>

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  return <AdminShell slug={tenantSlug} title="ข้อมูลต้นทาง ห้องของฉัน">
    <div className="toolbar"><div><h2>เจ้าของกรอกที่นี่ → ผู้เช่าเห็นที่ห้องของฉัน</h2><p className="muted">ข้อมูลหลักของห้องอยู่ฝั่งเจ้าของ ผู้เช่าเป็นผู้ดู ไม่แก้เลขห้อง ค่าเช่า เงินประกัน วันสัญญา หรือข้อมูลส่วนกลางของหอเอง</p></div><a className="btn" href={r.adminRooms}>กลับรายการห้อง</a></div>

    <RoomOwnerSourceForm/>

    <section className="grid section">
      <div className="card"><h3>ข้อมูลหลักจากตารางเดิม</h3><Row label="เลขห้อง / อาคาร / ชั้น" source="rooms" target="ภาพรวมห้อง"/><Row label="ผู้เช่าหลัก" source="profiles + active lease" target="ภาพรวมห้อง"/><Row label="ค่าเช่า / เงินประกัน / วันสัญญา" source="leases" target="ภาพรวม/สัญญา"/></div>
      <div className="card"><h3>ข้อมูลเสริมที่กรอกในฟอร์มนี้</h3><Row label="ที่อยู่จัดส่ง" source="room_portal_settings" target="ภาพรวมห้อง"/><Row label="ติดต่อหอ / Wi‑Fi" source="room_portal_settings" target="ภาพรวมห้อง"/><Row label="รับมอบ / ย้ายออก" source="room_portal_settings" target="ภาพรวมห้อง"/></div>
      <div className="card"><h3>ทรัพย์สิน</h3><Row label="แอร์ / เตียง / ตู้ / โต๊ะ / ทีวี" source="room_inventory_items" target="ภาพรวมห้อง"/><Row label="สภาพ / หมายเหตุ" source="room_inventory_items" target="ภาพรวมห้อง/เอกสาร"/></div>
    </section>

    <section className="section card"><h3>ข้อมูลที่แยกไปหน้าหลังบ้านเฉพาะทาง</h3><div className="flow"><a className="btn secondary" href={r.adminRoomOccupancy}>ผู้พักร่วม</a><a className="btn secondary" href={r.adminRoomVehicles}>รถของห้อง</a><a className="btn secondary" href={r.adminRoomDocuments}>เอกสารห้อง</a><a className="btn secondary" href={r.adminContracts}>สัญญา Paperless</a><a className="btn secondary" href={r.adminAccess}>NFC Access แยกโมดูล</a></div></section>

    <section className="section card noticeBox"><strong>ไม่เก็บซ้ำ</strong><p className="muted">บิล/สลิป/ใบเสร็จ → การเงิน · มิเตอร์ → มิเตอร์ · งานซ่อม → แจ้งซ่อม · รูป/ประวัติพัสดุ → บริการ · ประกาศ → ข่าวสาร · NFC → Access Control</p></section>
  </AdminShell>
}
