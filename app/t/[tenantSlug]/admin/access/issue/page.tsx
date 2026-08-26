import { tenantRoutes } from '../../../../../../lib/routes'
import NfcIssueForm from '../../../../../../components/NfcIssueForm'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  return <main className="wrap">
    <div className="toolbar"><div><a href={r.adminAccess}>← NFC Access Control</a><h1>ออกสิทธิ์ NFC</h1><p className="lead">เจ้าของหอเป็นผู้สร้างสิทธิ์ เลือกผู้เช่าและพื้นที่ เมื่อสร้างแล้วจะไปแสดงใน “ห้องของฉัน” ของผู้เช่าคนนั้น</p></div><span className="pill">Owner / Admin</span></div>
    <NfcIssueForm/>
    <section className="section card noticeBox"><strong>หมายเหตุ</strong><p className="muted">ปุ่มสร้างใน StayHub สร้าง credential + access grants และส่งสิทธิ์เข้าหน้าผู้เช่า ส่วนการ provision NFC ไปยังมือถือ/Wallet/เครื่องอ่านจริงยังขึ้นกับ provider ฮาร์ดแวร์ที่เชื่อมต่อ</p></section>
  </main>
}
