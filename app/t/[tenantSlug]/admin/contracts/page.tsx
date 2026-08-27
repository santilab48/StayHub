import AdminShell from '../../../../../components/AdminShell'
import ContractManager from '../../../../../components/ContractManager'
import RoomDisplayDocumentsForm from '../../../../../components/RoomDisplayDocumentsForm'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="สัญญา">
    <ContractManager/>
    <RoomDisplayDocumentsForm mode="contract"/>
    <section className="section card noticeBox"><strong>Paperless</strong><p className="muted">สัญญาใช้ข้อมูล active lease ของห้องเป็นต้นทางเดียว ลายเซ็นมีเจ้าของหอและผู้เช่า 2 ฝ่าย ส่วนรูปสัญญาที่อัปโหลดในหน้านี้จะผูก room_id และไปแสดงที่ “ห้องของฉัน” ของผู้เช่าห้องนั้น</p></section>
  </AdminShell>
}
