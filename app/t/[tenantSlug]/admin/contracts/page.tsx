import AdminShell from '../../../../../components/AdminShell'
import ContractManager from '../../../../../components/ContractManager'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <AdminShell slug={tenantSlug} title="สัญญา">
    <ContractManager/>
    <section className="section card noticeBox"><strong>Paperless</strong><p className="muted">ร่างสัญญาเก็บ snapshot + version, ลายเซ็นเก็บไฟล์ private แยกตาม lease และมี audit log ทุกครั้ง เมื่อเซ็นครบจะยังไม่แก้ snapshot เดิม ขั้น PDF Final จะสร้างจาก snapshot + signatures เท่านั้น</p></section>
  </AdminShell>
}
