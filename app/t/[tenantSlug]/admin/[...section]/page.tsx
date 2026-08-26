const labels: Record<string,string> = {
  rooms:'ห้องพัก', residents:'ผู้เช่า', contracts:'สัญญา Paperless', billing:'การเงิน',
  'billing/meter-walk':'โหมดเดินถ่ายมิเตอร์', 'billing/payments':'ตรวจสลิป/การชำระ', repairs:'แจ้งซ่อม',
  parcels:'พัสดุ', rides:'รถรับจ้าง', announcements:'ประกาศ', reports:'รายงาน', settings:'ตั้งค่า'
}
export default async function AdminSection({ params }: { params: Promise<{ tenantSlug: string; section: string[] }> }) {
  const { tenantSlug, section } = await params
  const key = section.join('/')
  const title = labels[key] || 'StayHub Admin'
  return <main className="wrap"><a href={`/t/${tenantSlug}/admin`}>← Admin</a><div className="card" style={{marginTop:18}}><span className="badge">{tenantSlug}</span><h1>{title}</h1><p className="muted">เส้นทาง: /t/{tenantSlug}/admin/{key}</p><p>พื้นที่นี้ต้องตรวจ tenant + subscription + role ก่อนดำเนินการ และทุก record ต้องตรวจ tenant ownership ซ้ำอีกชั้น</p></div></main>
}
