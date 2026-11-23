// The previous Platform UI relied on a different Supabase identity and its
// buttons had no verified database handlers. Do not show inert privileged
// controls or throw a missing-Supabase-config error in Neon Production.
// Platform admin onboarding and hardware authorization require an explicit,
// audited account provisioning workflow before this surface can be enabled.
export const dynamic='force-dynamic'
export default function PlatformUnavailable(){
 return <main className="wrap" style={{maxWidth:850}}>
  <section className="card section">
   <h1>การจัดการแพลตฟอร์มยังไม่เปิดใช้งาน</h1>
   <p>เมนู Super Admin เดิมถูกปิดไว้ เพราะไม่ได้เชื่อมกับบัญชีผู้ดูแลและฐาน Neon อย่างปลอดภัย</p>
   <p className="muted">ระบบจัดการหอพัก มิเตอร์ บิล รับชำระ และงานบริการอยู่ใน StayHub Cloud</p>
   <a className="btn" href="/cloud">ไปจัดการที่พัก</a>
  </section>
 </main>
}
