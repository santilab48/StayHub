export default function Home(){
  return <main className="wrap">
    <section className="hero card" style={{padding:32}}>
      <span className="badge">StayHub</span>
      <h1>จัดการที่พักได้ง่าย ในแอปเดียว</h1>
      <p className="lead">ไม่ต้องมี LINE OA เปิดเว็บ ตั้งค่าหอพัก เกสต์เฮาส์ ที่พักรายวัน หรือโฮมสเตย์ และเริ่มจัดการข้อมูลบนเครื่องของคุณได้ทันที</p>
      <div className="flow"><a className="btn" href="/start">เริ่มต้นใช้งานฟรีบนเครื่องนี้</a><a className="btn secondary" href="/workspace">เปิดพื้นที่ของฉัน</a></div>
      <p className="footnote">ขณะนี้เป็นพื้นที่ใช้งาน Local-First ขั้นต้น ยังไม่มีบัญชีออนไลน์หรือการแชร์ข้อมูลกับผู้เช่า การใช้งานหลายเครื่องและการสำรอง Cloud จะเปิดหลังระบบบัญชีพร้อม</p>
    </section>
    <section className="section grid">
      <div className="card"><div className="icon">🏠</div><h3>ที่พักของคุณ</h3><p className="muted">เริ่มตั้งค่าหอพัก เกสต์เฮาส์ รายวัน และโฮมสเตย์ได้โดยไม่ผูกกับ LINE</p></div>
      <div className="card"><div className="icon">💾</div><h3>ข้อมูลในเครื่อง</h3><p className="muted">เก็บข้อมูลเริ่มต้นผ่าน IndexedDB</p></div>
      <div className="card"><div className="icon">🔐</div><h3>เชื่อมบัญชีในอนาคต</h3><p className="muted">ข้อมูลแชร์และการเงินต้องได้รับการตรวจสิทธิ์จาก Server</p></div>
    </section>
  </main>
}
