import AdminShell from '../../../../../../components/AdminShell'
import { tenantRoutes } from '../../../../../../lib/routes'

const Row=({label,source,target}:{label:string,source:string,target:string})=><div className="infoRow"><span><strong>{label}</strong><small className="muted" style={{display:'block'}}>{source}</small></span><span className="pill">{target}</span></div>

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  return <AdminShell slug={tenantSlug} title="ข้อมูลต้นทาง ห้องของฉัน">
    <div className="toolbar"><div><h2>เจ้าของกรอกที่นี่ → ผู้เช่าเห็นที่ห้องของฉัน</h2><p className="muted">หน้านี้เป็น source of truth ของข้อมูลประจำห้อง ผู้เช่าไม่แก้เลขห้อง ค่าเช่า เงินประกัน วันสัญญา หรือข้อมูลส่วนกลางของหอเอง</p></div><a className="btn" href={r.adminRooms}>กลับรายการห้อง</a></div>

    <section className="grid section">
      <div className="card"><h3>1. ข้อมูลห้อง</h3><Row label="เลขห้อง" source="rooms.room_no" target="ภาพรวมห้อง"/><Row label="อาคาร" source="rooms.building_id" target="ภาพรวมห้อง"/><Row label="ชั้น" source="rooms.floor" target="ภาพรวมห้อง"/><Row label="สถานะห้อง" source="rooms.status" target="ภาพรวมห้อง"/></div>
      <div className="card"><h3>2. สัญญาปัจจุบัน</h3><Row label="วันเริ่มสัญญา" source="leases.start_date" target="สัญญา"/><Row label="วันสิ้นสุด" source="leases.end_date" target="สัญญา"/><Row label="ค่าเช่ารายเดือน" source="leases.rent_amount" target="ภาพรวม/สัญญา"/><Row label="เงินประกัน" source="leases.deposit_amount" target="ภาพรวม/สัญญา"/></div>
      <div className="card"><h3>3. ผู้เช่าหลัก</h3><Row label="ชื่อผู้เช่า" source="profiles + active lease" target="ภาพรวมห้อง"/><Row label="เบอร์โทร" source="profiles" target="ภาพรวมห้อง"/><Row label="ผู้ติดต่อฉุกเฉิน" source="tenant verified profile data" target="ภาพรวมห้อง"/></div>
      <div className="card"><h3>4. ติดต่อหอ</h3><Row label="สำนักงาน / เจ้าของ" source="tenant_settings.contact_phone" target="ภาพรวมห้อง"/><Row label="รปภ." source="tenant_settings.security_phone" target="ภาพรวมห้อง"/><Row label="เบอร์ฉุกเฉิน" source="tenant_settings.emergency_phone" target="ภาพรวมห้อง"/></div>
      <div className="card"><h3>5. Wi‑Fi</h3><Row label="ชื่อเครือข่าย" source="room / building wifi_ssid" target="ภาพรวมห้อง"/><Row label="รหัสผ่าน" source="room / building wifi_password" target="ภาพรวมห้อง"/><Row label="หมายเหตุ" source="wifi_note" target="ภาพรวมห้อง"/></div>
      <div className="card"><h3>6. ที่อยู่จัดส่ง</h3><Row label="ที่อยู่หอ" source="tenant/building delivery address" target="ภาพรวมห้อง"/><Row label="รหัสไปรษณีย์" source="delivery_postcode" target="ภาพรวมห้อง"/><Row label="รูปแบบชื่อห้อง" source="room_no + building" target="คัดลอกที่อยู่"/></div>
      <div className="card"><h3>7. รับมอบห้อง</h3><Row label="วันที่เข้าอยู่" source="lease / move_in_at" target="ภาพรวมห้อง"/><Row label="จำนวนกุญแจ" source="room_handover.key_count" target="ภาพรวมห้อง"/><Row label="จำนวน Key Card" source="room_handover.card_count" target="ภาพรวมห้อง"/><Row label="สภาพห้องตอนรับ" source="room_handover.condition_note" target="ภาพรวมห้อง"/></div>
      <div className="card"><h3>8. ย้ายออก</h3><Row label="แจ้งย้ายออก" source="move_out_notice" target="ภาพรวมห้อง"/><Row label="วันนัดตรวจห้อง" source="inspection_at" target="ภาพรวมห้อง"/><Row label="สถานะคืนห้อง" source="handover_return_status" target="ภาพรวมห้อง"/></div>
      <div className="card"><h3>9. ทรัพย์สินประจำห้อง</h3><Row label="รายการทรัพย์สิน" source="room_inventory" target="ภาพรวมห้อง/เอกสาร"/><Row label="สภาพตอนรับ" source="room_inventory condition" target="ภาพรวมห้อง/เอกสาร"/><Row label="รูปหลักฐาน" source="storage + room_inventory" target="เอกสารห้อง"/></div>
    </section>

    <section className="section card"><h3>ข้อมูลที่แยกไปหน้าหลังบ้านเฉพาะทาง</h3><div className="flow"><a className="btn secondary" href={r.adminRoomOccupancy}>ผู้พักร่วม</a><a className="btn secondary" href={r.adminRoomVehicles}>รถของห้อง</a><a className="btn secondary" href={r.adminRoomDocuments}>เอกสารห้อง</a><a className="btn secondary" href={r.adminContracts}>สัญญา Paperless</a><a className="btn secondary" href={r.adminAccess}>NFC Access แยกโมดูล</a></div></section>

    <section className="section card noticeBox"><strong>ไม่เก็บที่นี่</strong><p className="muted">บิล/สลิป/ใบเสร็จ → การเงิน · มิเตอร์ → มิเตอร์ · งานซ่อม → แจ้งซ่อม · รูป/ประวัติพัสดุ → บริการ · ประกาศเฉพาะห้อง → ข่าวสาร · NFC → Access Control หน้า “ห้องของฉัน” อ่านเฉพาะข้อมูลสรุปจากแต่ละ source ไม่สร้างข้อมูลซ้ำ</p></section>
  </AdminShell>
}
