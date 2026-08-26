const labels: Record<string,string> = {
  tenants:'OA / ผู้เช่าระบบ', 'tenants/new':'เพิ่ม OA ใหม่', billing:'ค่าเช่าระบบ', reports:'รายงานแพลตฟอร์ม', settings:'ตั้งค่าแพลตฟอร์ม'
}
export default async function PlatformSection({ params }: { params: Promise<{ section: string[] }> }) {
  const { section } = await params
  const key = section.join('/')
  const title = labels[key] || (key.startsWith('tenants/') ? 'รายละเอียด OA / Subscription' : 'StayHub Platform')
  return <main className="wrap"><a href="/platform">← Platform</a><div className="card" style={{marginTop:18}}><span className="badge owner">PLATFORM OWNER</span><h1>{title}</h1><p className="muted">เส้นทาง: /platform/{key}</p><p>ชั้นนี้ใช้สำหรับจัดการ OA, ค่าเช่าระบบ, suspend/resume และข้อมูลรวมเท่านั้น ไม่ใช้เป็นเส้นทางปฏิบัติการของผู้เช่าในหอ</p></div></main>
}
