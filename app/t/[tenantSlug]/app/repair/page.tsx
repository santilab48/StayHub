import TenantShell from '../../../../../components/TenantShell'
import ResidentRepairCenter from '../../../../../components/ResidentRepairCenter'
import { tenantRoutes } from '../../../../../lib/routes'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  return <TenantShell slug={tenantSlug} title="แจ้งซ่อม & บริการ">
    <section className="card"><div className="toolbar"><div><span className="eyebrow">REPAIR & SERVICES</span><h2>แจ้งซ่อมและบริการของหอ</h2><p className="muted">แจ้งซ่อมแบบสั้น เจ้าของรับงานและนัดหมายภายหลัง</p></div><span className="pill">เฉพาะห้องของฉัน</span></div></section>
    <ResidentRepairCenter/>
    <section className="section card"><h3>บริการด่วน</h3><div className="grid">
      <a className="card tile" href="#moving"><span className="icon">🚚</span><div><h3>รถขนของ</h3><p className="muted">ชื่อบริการและเบอร์โทรกำหนดโดยเจ้าของหอ</p></div></a>
      <a className="card tile" href="#win"><span className="icon">🏍️</span><div><h3>เรียกวิน</h3><p className="muted">ชื่อวินและเบอร์โทรกำหนดโดยเจ้าของหอ</p></div></a>
      <a className="card tile" href="https://www.grab.com/th/" target="_blank" rel="noreferrer"><span className="icon">🚕</span><div><h3>เรียก Grab</h3><p className="muted">เปิด Grab โดยตรง</p></div></a>
      <a className="card tile" href="#owner"><span className="icon">☎️</span><div><h3>ติดต่อเจ้าของ</h3><p className="muted">หัวข้อและเบอร์โทรกำหนดโดยเจ้าของหอ</p></div></a>
    </div></section>
    <section className="section card"><h3>ช่วยเหลือ</h3><div className="grid">
      <a className="card tile" href={r.services}><span className="icon">📦</span><div><h3>พัสดุ</h3><p className="muted">ดูรายการรอรับและประวัติ</p></div></a>
      <a className="card tile" href="#lost-found"><span className="icon">🔎</span><div><h3>ของหาย / พบของ</h3><p className="muted">แจ้งรายละเอียดและแนบรูป</p></div></a>
      <a className="card tile" href="#emergency"><span className="icon">🚨</span><div><h3>ฉุกเฉิน</h3><p className="muted">ติดต่อเบอร์ฉุกเฉินของหอ</p></div></a>
      <a className="card tile" href="#request"><span className="icon">📝</span><div><h3>คำขอทั่วไป</h3><p className="muted">เรื่องอื่นที่ไม่ใช่งานซ่อม</p></div></a>
    </div></section>
  </TenantShell>
}
