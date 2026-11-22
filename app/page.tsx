export default function Home(){
  return <main className="wrap">
    <section className="hero card" style={{padding:32}}>
      <span className="badge">StayHub</span>
      <h1>จัดการที่พักได้ง่าย ในแอปเดียว</h1>
      <p className="lead">เลือกประเภทที่พักก่อน สมัครสมาชิก แล้วเริ่มสร้างที่พักและ QR ให้ผู้เช่าได้จากบัญชีเจ้าของ ไม่ต้องใช้ LINE OA</p>
      <div className="flow"><a className="btn" href="/cloud">เริ่มต้นสำหรับเจ้าของที่พัก</a><a className="btn secondary" href="/cloud">เข้าสู่ระบบเจ้าของ</a><a className="btn secondary" href="/start">โหมดทดลองในเครื่อง</a><a className="btn secondary" href="/my">แผงผู้เช่า</a></div>
      <p className="footnote">ฟังก์ชัน Cloud และ Billing อยู่ระหว่างตรวจสอบความพร้อมก่อนเปิดใช้จริง โปรดอย่าใช้ข้อมูลการเงินหรือข้อมูลผู้เช่าจริงระหว่างช่วงทดสอบ ข้อมูลในเครื่องและ Cloud ยังไม่ซิงก์กัน</p>
    </section>
    <section className="section grid">
      <div className="card"><div className="icon">🏠</div><h3>ที่พักของคุณ</h3><p className="muted">เริ่มตั้งค่าหอพัก เกสต์เฮาส์ รายวัน และโฮมสเตย์ได้โดยไม่ผูกกับ LINE</p></div>
      <div className="card"><div className="icon">💾</div><h3>ข้อมูลในเครื่อง</h3><p className="muted">เก็บข้อมูลเริ่มต้นผ่าน IndexedDB</p></div>
      <div className="card"><div className="icon">🔐</div><h3>เชื่อมบัญชีในอนาคต</h3><p className="muted">ข้อมูลแชร์และการเงินต้องได้รับการตรวจสิทธิ์จาก Server</p></div>
    </section>
  </main>
}
