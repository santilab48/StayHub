const residentMenus = [
  ['🏠','ห้องของฉัน','room'],
  ['💳','บิล & ชำระ','billing'],
  ['🔧','แจ้งซ่อม','repair'],
  ['📦','บริการ','services'],
  ['📢','ข่าวสาร','news'],
]

export default async function TenantApp({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params
  return <main className="wrap"><div className="topbar"><div><span className="brand">StayHub</span><span className="badge">{tenantSlug}</span></div></div><h1>บริการผู้เช่า</h1><p className="muted">ข้อมูลทั้งหมดของหน้านี้ต้องถูกกรองด้วย tenant ของ {tenantSlug}</p><div className="grid">{residentMenus.map(([icon,title,path])=><a className="card tile" href={`/t/${tenantSlug}/app/${path}`} key={path}><div className="icon">{icon}</div><strong>{title}</strong></a>)}</div><div className="card" style={{marginTop:16}}><a href={`/t/${tenantSlug}/admin`}>⚙️ จัดการหอ (สำหรับเจ้าหน้าที่)</a></div></main>
}
