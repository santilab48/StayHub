const adminMenus = [
  ['Dashboard',''],['ห้องพัก','rooms'],['ผู้เช่า','residents'],['สัญญา Paperless','contracts'],['การเงิน','billing'],['มิเตอร์ OCR','billing/meter-walk'],['แจ้งซ่อม','repairs'],['พัสดุ','parcels'],['รถรับจ้าง','rides'],['ประกาศ','announcements'],['รายงาน','reports'],['ตั้งค่า','settings']
]
export default async function TenantAdmin({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params
  return <main className="wrap"><div className="topbar"><div><span className="brand">StayHub Admin</span><span className="badge">{tenantSlug}</span></div><a href={`/t/${tenantSlug}/app`}>← ผู้เช่า</a></div><h1>จัดการหอ</h1><p className="muted">พื้นที่นี้ต้องผ่าน tenant guard + role guard (staff/admin/owner)</p><div className="grid">{adminMenus.map(([title,path])=><a className="card" href={`/t/${tenantSlug}/admin${path?`/${path}`:''}`} key={title}><strong>{title}</strong></a>)}</div></main>
}
