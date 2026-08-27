import AdminShell from '../../../../../components/AdminShell'
import ContractManager from '../../../../../components/ContractManager'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="สัญญา">
    <ContractManager/>
    <section className="section card noticeBox"><strong>Paperless</strong><p className="muted">สัญญาใช้ข้อมูล active lease ของห้องเป็นต้นทางเดียว ลายเซ็นมีเจ้าของหอและผู้เช่า 2 ฝ่าย รูปสัญญาและกฎระเบียบให้อัปโหลดจากแท็บ “ทั่วไป” หลังเลือกห้อง เพื่อใช้ room_id เดียวกันทั้งชุด</p></section>
  </AdminShell>
}
