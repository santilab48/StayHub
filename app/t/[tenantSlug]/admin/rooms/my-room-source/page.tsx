import AdminShell from '../../../../../../components/AdminShell'
import { tenantRoutes } from '../../../../../../lib/routes'

const Row=({label,source,target}:{label:string,source:string,target:string})=><div className="infoRow"><span><strong>{label}</strong><small className="muted" style={{display:'block'}}>{source}</small></span><span className="pill">{target}</span></div>

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  return <AdminShell slug={tenantSlug} title="ข้อมูลต้นทาง ห้องของฉัน">
    <div className="toolbar"><div><h2>เจ้าของกรอกที่นี่ → ผู้เช่าเห็นที่ห้องของฉัน</h2><p className="muted">หน้านี้เป็น source of truth ของข้อมูลห้อง ห้ามให้ผู้เช่าแก้เลขห้อง ค่าเช่า เงินประกัน หรือวันสัญญาเอง</p></div><a className="btn" href={r.adminRooms}>กลับรายการห้อง</a></div>

    <section className="grid section">
      <div className="card"><h3>1. ข้อมูลห้อง</h3><Row label="เลขห้อง" source="rooms.room_no" target="ภาพรวมห้อง"/><Row label="อาคาร" source="rooms.building_id" target="ภาพรวมห้อง"/><Row label="ชั้น" source="rooms.floor" target="ภาพรวมห้อง"/><Row label="สถานะห้อง" source="rooms.status" target="ภาพรวมห้อง"/></div>
      <div className="card"><h3>2. สัญญาปัจจุบัน</h3><Row label="วันเริ่มสัญญา" source="leases.start_date" target="สัญญา"/><Row label="วันสิ้นสุด" source="leases.end_date" target="สัญญา"/><Row label="ค่าเช่ารายเดือน" source="leases.rent_amount" target="ภาพรวม/สัญญา"/><Row label="เงินประกัน" source="leases.deposit_amount" target="ภาพรวม/สัญญา"/></div>
      <div className="card"><h3>3. ผู้เช่าหลัก</h3><Row label="ชื่อผู้เช่า" source="profiles + active lease" target="ภาพรวมห้อง"/><Row label="เบอร์โทร" source="profiles" target="ภาพรวมห้อง"/><Row label="ผู้ติดต่อฉุกเฉิน" source="ข้อมูลยืนยันโดยเจ้าของ" target="ภาพรวมห้อง"/></div>
    </section>

    <section className="section card"><h3>ข้อมูลที่แยกไปหน้าหลังบ้านเฉพาะทาง</h3><div className="flow"><a className="btn secondary" href={r.adminRoomOccupancy}>ผู้พักร่วม</a><a className="btn secondary" href={r.adminRoomVehicles}>รถของห้อง</a><a className="btn secondary" href={r.adminRoomDocuments}>เอกสารห้อง</a><a className="btn secondary" href={r.adminContracts}>สัญญา Paperless</a><a className="btn secondary" href={r.adminAccess}>NFC Access แยกโมดูล</a></div></section>

    <section className="section card noticeBox"><strong>ไม่เก็บที่นี่</strong><p className="muted">บิล/สลิป/ใบเสร็จ → การเงิน, มิเตอร์ → มิเตอร์, งานซ่อม → แจ้งซ่อม, พัสดุ/รถรับจ้าง → บริการ, NFC → Access Control. หน้า “ห้องของฉัน” จะอ่านข้อมูลจากแต่ละ source เท่านั้น ไม่สร้างข้อมูลซ้ำ</p></section>
  </AdminShell>
}
