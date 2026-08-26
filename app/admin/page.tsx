const items=['ห้องพัก','ผู้เช่า','สัญญา Paperless','การเงิน','มิเตอร์ OCR','แจ้งซ่อม','พัสดุ','รถรับจ้าง','ประกาศ','รายงาน','ตั้งค่า']
export default function Admin(){
  return <main className="wrap">
    <div className="toolbar"><div><a href="/">← Rich Menu</a><h1 style={{marginBottom:4}}>⚙️ จัดการหอ</h1><div className="muted">Admin ของแต่ละ OA เห็นเฉพาะข้อมูล tenant ตัวเอง</div></div><a className="btn secondary" href="/platform">Platform Admin</a></div>
    <div className="metricGrid">
      <div className="metric"><span className="muted">ห้องทั้งหมด</span><strong>—</strong></div>
      <div className="metric"><span className="muted">ค้างชำระ</span><strong>—</strong></div>
      <div className="metric"><span className="muted">งานซ่อมค้าง</span><strong>—</strong></div>
      <div className="metric"><span className="muted">พัสดุรอรับ</span><strong>—</strong></div>
    </div>
    <section className="section"><h2>เมนูจัดการ</h2><div className="grid">{items.map(x=><div className="card" key={x}><strong>{x}</strong><div className="muted" style={{marginTop:8}}>ผูก tenant_id ทุกคำสั่ง</div></div>)}</div></section>
    <section className="section card"><strong>ระบบมิเตอร์</strong><p className="muted">โหมดเดินจด: เลือกอาคาร/ชั้น → ถ่ายมิเตอร์ → OCR อ่านค่า → พนักงานตรวจ → ยืนยัน → คำนวณบิล</p></section>
  </main>
}
