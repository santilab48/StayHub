import TenantShell from '../../../../../components/TenantShell'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <TenantShell slug={tenantSlug} title="ข่าวสาร">
    <section className="card"><div className="toolbar"><div><span className="eyebrow">NEWS</span><h2>ประกาศของหอ</h2><p className="muted">เห็นเฉพาะประกาศที่เกี่ยวกับห้องของคุณ เช่น ทั้งหอ อาคาร ชั้น หรือห้องเฉพาะ</p></div><span className="pill">เฉพาะที่เกี่ยวข้อง</span></div></section>

    <section className="section card noticeBox"><div className="toolbar"><div><strong>📌 ประกาศสำคัญ</strong><p className="muted">ประกาศที่เจ้าของปักหมุดจะแสดงก่อนรายการทั่วไป</p></div><span className="pill warn">—</span></div></section>

    <section className="section card">
      <div className="toolbar"><div><h3>ประกาศล่าสุด</h3><p className="muted">เรียงใหม่ไปเก่า และซ่อนอัตโนมัติเมื่อพ้นวันหมดอายุ</p></div><button className="btn secondary">ดูทั้งหมด</button></div>
      <div className="section">
        <div className="row"><div><strong>ยังไม่มีประกาศ</strong><div className="muted">เมื่อมีประกาศที่ตรงกับห้องของคุณ ระบบจะแสดงที่นี่</div></div><span className="pill off">—</span></div>
      </div>
    </section>

    <section className="section card"><h3>ประเภทที่อาจได้รับ</h3><div className="flow"><span className="pill">ทั้งหอ</span><span className="pill">อาคาร</span><span className="pill">ชั้น</span><span className="pill">ห้องของฉัน</span></div><p className="muted section">ประกาศสามารถมีรูปหรือไฟล์แนบได้ และถ้าเจ้าของเลือกส่ง LINE จะเปิดดูประกาศเดียวกันจากการ์ดได้</p></section>
  </TenantShell>
}
