import AdminShell from '../../../../../components/AdminShell'
import EmptyState from '../../../../../components/EmptyState'
export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){const {tenantSlug}=await params;return <AdminShell slug={tenantSlug} title="ผู้เช่า"><div className="toolbar"><div className="muted">สมาชิก LINE → profile → lease → room</div><button className="btn">+ เพิ่มผู้เช่า</button></div><EmptyState title="ยังไม่มีผู้เช่า" detail="เมื่อย้ายห้องจะสร้าง/เปลี่ยน lease ไม่ย้ายประวัติบิลและสัญญาออกจาก record เดิม"/></AdminShell>}
