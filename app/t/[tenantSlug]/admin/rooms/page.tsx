import AdminShell from '../../../../../components/AdminShell'
import EmptyState from '../../../../../components/EmptyState'
import { tenantRoutes } from '../../../../../lib/routes'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  return <AdminShell slug={tenantSlug} title="ห้องพัก">
    <div className="toolbar"><div><h2>หลังบ้านห้องพัก</h2><p className="muted">อาคาร → ชั้น → ห้อง → สถานะ และข้อมูลต้นทางที่ส่งไปหน้า “ห้องของฉัน”</p></div><button className="btn">+ เพิ่มห้อง</button></div>
    <div className="grid section">
      <a className="card tile" href={r.adminRoomSource}><span className="icon">🏠</span><h3>ข้อมูลต้นทาง ห้องของฉัน</h3><p className="muted">เลขห้อง อาคาร ชั้น ผู้เช่าหลัก ค่าเช่า เงินประกัน และวันสัญญา</p></a>
      <a className="card tile" href={r.adminRoomOccupancy}><span className="icon">👥</span><h3>ผู้พักในห้อง</h3><p className="muted">เพิ่ม/อนุมัติผู้พักร่วมและเก็บประวัติย้ายเข้าออก</p></a>
      <a className="card tile" href={r.adminRoomVehicles}><span className="icon">🚗</span><h3>รถของห้อง</h3><p className="muted">ทะเบียนรถและสถานะอนุมัติ ไม่เก็บสิทธิ์ NFC ซ้ำ</p></a>
      <a className="card tile" href={r.adminRoomDocuments}><span className="icon">📄</span><h3>เอกสารห้อง</h3><p className="muted">ไฟล์ที่อนุญาตให้ผู้เช่าเห็นในห้องของฉัน</p></a>
    </div>
    <section className="section"><EmptyState title="ยังไม่มีห้อง" detail="ห้องแต่ละห้องผูก tenant_id + building_id และ room_no ห้ามใช้เลขห้องอย่างเดียวเป็น key"/></section>
  </AdminShell>
}
