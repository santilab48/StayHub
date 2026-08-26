const labels: Record<string,string> = {
  room:'ห้องของฉัน', 'room/contract':'สัญญา Paperless',
  billing:'บิล & ชำระ', repair:'แจ้งซ่อม', 'repair/new':'แจ้งซ่อมใหม่',
  services:'บริการ', 'services/parcels':'พัสดุ', 'services/rides':'เรียกรถ', 'services/rides/new':'จอง/เรียกรถ',
  news:'ข่าวสาร'
}
export default async function ResidentSection({ params }: { params: Promise<{ tenantSlug: string; section: string[] }> }) {
  const { tenantSlug, section } = await params
  const key = section.join('/')
  const title = labels[key] || 'StayHub'
  return <main className="wrap"><a href={`/t/${tenantSlug}/app`}>← กลับ</a><div className="card" style={{marginTop:18}}><span className="badge">{tenantSlug}</span><h1>{title}</h1><p className="muted">เส้นทาง: /t/{tenantSlug}/app/{key}</p><p>หน้านี้ถูกกำหนดให้อยู่ใน tenant เดียวกันและต้องตรวจ tenant/session ก่อนอ่านหรือเขียนข้อมูลจริง</p></div></main>
}
