import AdminShell from '../../../../../../components/AdminShell'
import RoomOwnerSourceForm from '../../../../../../components/RoomOwnerSourceForm'
import {tenantRoutes} from '../../../../../../lib/routes'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
 const {tenantSlug}=await params
 const r=tenantRoutes(tenantSlug)
 return <AdminShell slug={tenantSlug} title="ข้อมูลที่แสดงในห้องของฉัน">
  <div className="toolbar"><div><h2>ข้อมูลที่ผู้พักจะเห็น</h2><p className="muted">เลือกห้องแล้วกรอกข้อมูลที่ต้องโชว์ในหน้า “ห้องของฉัน” จากจุดเดียว ส่วน NFC / สัญญา / กฎระเบียบ / ผู้พัก / รถ จะลิงก์ไปแก้ที่โมดูลต้นทางเดิมเพื่อไม่เก็บซ้ำ</p></div><a className="btn secondary" href={r.adminRooms}>กลับห้องพัก</a></div>
  <RoomOwnerSourceForm slug={tenantSlug}/>
  <section className="section card noticeBox"><strong>หน้านี้ไม่เกี่ยวกับบิล</strong><p className="muted">บิลและการชำระเงินอยู่หน้า “ทำบิล” แยกต่างหาก · งานแจ้งซ่อมเป็นข้อมูลที่ผู้พักส่งเข้ามา · หน้านี้ใช้เฉพาะข้อมูลที่เจ้าของเป็นคนกรอกเพื่อให้ผู้พักดู</p></section>
 </AdminShell>
}
