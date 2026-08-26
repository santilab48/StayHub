const oa=[
  {name:'ตัวอย่าง OA A',status:'active',due:'—'},
  {name:'ตัวอย่าง OA B',status:'past_due',due:'—'},
  {name:'ตัวอย่าง OA C',status:'suspended',due:'—'}
]
export default function Platform(){
  return <main className="wrap">
    <div className="toolbar"><div><a href="/admin">← Admin</a><h1 style={{marginBottom:4}}>StayHub Platform</h1><div className="muted">หน้ากลางสำหรับเจ้าของระบบ คุมหลาย OA และค่าเช่ารายเดือน</div></div><button className="btn">+ เพิ่ม OA</button></div>
    <div className="metricGrid">
      <div className="metric"><span className="muted">OA ทั้งหมด</span><strong>—</strong></div>
      <div className="metric"><span className="muted">ใช้งาน</span><strong>—</strong></div>
      <div className="metric"><span className="muted">ค้างชำระ</span><strong>—</strong></div>
      <div className="metric"><span className="muted">ระงับ</span><strong>—</strong></div>
    </div>
    <section className="section"><h2>จัดการ OA</h2><div className="list">{oa.map(x=><div className="row" key={x.name}><div><strong>{x.name}</strong><div className="muted">Tenant แยกอิสระ • ข้อมูลไม่ข้าม OA</div></div><span className={`pill ${x.status==='past_due'?'warn':x.status==='suspended'?'off':''}`}>{x.status}</span></div>)}</div></section>
    <section className="section card"><strong>กติกาการล็อก</strong><p className="muted">ถ้า subscription ของ OA เป็น suspended ระบบจะปิดเฉพาะ Web App ของ tenant นั้น ข้อมูลยังเก็บครบ และ OA อื่นทำงานต่อปกติ เมื่อกลับเป็น active จะเปิดใช้งานต่อจากข้อมูลเดิม</p></section>
  </main>
}
