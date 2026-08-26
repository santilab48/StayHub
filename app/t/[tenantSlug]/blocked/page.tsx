export default async function Blocked({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params
  return <main className="wrap"><div className="card"><span className="badge warn">ระงับการใช้งาน</span><h1>StayHub ของ {tenantSlug}</h1><p className="muted">ระบบของ OA/หอนี้ถูกระงับชั่วคราวตามสถานะการเช่า ข้อมูลยังถูกเก็บไว้และ OA อื่นไม่ได้รับผลกระทบ</p></div></main>
}
