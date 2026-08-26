import AdminShell from '../../../../../components/AdminShell'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="ผู้เช่า">
    <section className="card"><div className="toolbar"><div><h2>สมาชิกผู้เช่าปัจจุบัน</h2><p className="muted">ตารางหลักสำหรับดูว่าใครอยู่ห้องไหน ติดต่ออย่างไร เข้าอยู่เมื่อไร และมียอดค้างเท่าไร</p></div><button className="btn">+ เพิ่มผู้เช่า</button></div></section>
    <section className="section card">
      <div className="toolbar"><input placeholder="ค้นหาชื่อ / ห้อง / เบอร์โทร"/><select><option>ทั้งหมด</option><option>กำลังเข้าพัก</option><option>ค้างชำระ</option><option>กำลังย้ายออก</option></select></div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th align="left">ชื่อ</th><th align="left">ห้อง</th><th align="left">เบอร์โทร</th><th align="left">วันที่เข้า</th><th align="right">ยอดค้าง</th><th align="left">สถานะ</th></tr></thead><tbody><tr><td>—</td><td>—</td><td>—</td><td>—</td><td align="right">— บาท</td><td><span className="pill">—</span></td></tr></tbody></table></div>
    </section>
    <section className="section card noticeBox"><strong>กดผู้เช่า 1 คน</strong><p className="muted">ภายหลังจะเปิดรายละเอียดสมาชิก: ห้องปัจจุบัน, สัญญา, รถ, ผู้พักร่วม, บิล/ยอดค้าง, เอกสาร, สถานะย้ายออก และสิทธิ์ NFC โดยไม่ทำสำเนาข้อมูลชุดใหม่</p></section>
  </AdminShell>
}
