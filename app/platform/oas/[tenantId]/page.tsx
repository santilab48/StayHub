import SuperAdminTenantRentalControl from '../../../../components/SuperAdminTenantRentalControl'

const blocks = [
  ['ข้อมูล OA','ชื่อหอ • slug • LINE OA ID • สถานะ'],
  ['การใช้งาน','อาคาร • ห้อง • ผู้ใช้ • งานซ่อม • พัสดุ'],
  ['ผู้ติดต่อ','Owner • Billing • Technical'],
  ['ประวัติ','การชำระ • suspend/resume • หมายเหตุ'],
  ['Support Mode','เข้าโหมดช่วยเหลือแบบมีเหตุผลและ audit log']
]
export default async function Page({params}:{params:Promise<{tenantId:string}>}){
  const {tenantId}=await params
  return <main className="wrap"><a href="/platform/oas">← OA ทั้งหมด</a><div className="toolbar"><div><h1>Super Admin · OA Detail</h1><div className="muted">Tenant ID: {tenantId}</div></div><div style={{display:'flex',gap:8}}><button className="btn secondary">Suspend</button><button className="btn">Resume / Activate</button></div></div><SuperAdminTenantRentalControl tenantId={tenantId}/><section className="section"><div className="grid">{blocks.map(([t,d])=><div className="card" key={t}><h3>{t}</h3><p className="muted">{d}</p></div>)}</div></section></main>
}
