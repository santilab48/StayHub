export default function MyRoomPreview(){
  return <main className="wrap">
    <section className="roomHero card myRoomHeroReal">
      <div>
        <span className="eyebrow">STAYHUB · ROOM PREVIEW</span>
        <h1 style={{fontSize:34,margin:'8px 0'}}>ห้อง A201</h1>
        <p className="lead" style={{margin:0}}>อาคาร A · ชั้น 2 · ผู้เช่า สมชาย ใจดี</p>
        <div className="flow"><span>สัญญาใช้งานอยู่</span><span>ค่าเช่า 5,500 บาท/เดือน</span><span>สิ้นสุด 31 ธ.ค. 2567</span></div>
      </div>
      <a className="btn repairPrimary" href="#repair">🛠️ แจ้งซ่อม</a>
    </section>

    <section className="section"><h2>ข้อมูลสำคัญ</h2><div className="metricGrid">
      <div className="metric"><span className="muted">พัสดุรอรับ</span><strong>2</strong><small>ล่าสุดวันนี้</small></div>
      <div className="metric"><span className="muted">NFC</span><strong>พร้อมใช้</strong><small>สิทธิ์จากเจ้าของ</small></div>
      <div className="metric"><span className="muted">ผู้พัก</span><strong>2 คน</strong><small>อนุมัติแล้ว</small></div>
      <div className="metric"><span className="muted">รถ</span><strong>1 คัน</strong><small>ลงทะเบียนแล้ว</small></div>
    </div></section>

    <section className="section splitGrid">
      <div className="card"><h3>🏠 ข้อมูลห้อง</h3><div className="infoRow"><span className="muted">เลขห้อง</span><strong>A201</strong></div><div className="infoRow"><span className="muted">อาคาร / ชั้น</span><strong>A / 2</strong></div><div className="infoRow"><span className="muted">สถานะ</span><strong>ปกติ</strong></div></div>
      <div className="card"><h3>📄 สัญญาปัจจุบัน</h3><div className="infoRow"><span className="muted">เริ่ม</span><strong>1 ม.ค. 2567</strong></div><div className="infoRow"><span className="muted">สิ้นสุด</span><strong>31 ธ.ค. 2567</strong></div><div className="infoRow"><span className="muted">เงินประกัน</span><strong>11,000 บาท</strong></div></div>
    </section>

    <section className="section splitGrid">
      <div className="card"><h3>📶 Wi‑Fi ห้อง</h3><div className="infoRow"><span className="muted">ชื่อเครือข่าย</span><strong>StayHub_A201</strong></div><div className="infoRow"><span className="muted">รหัสผ่าน</span><strong>••••••••</strong></div><button className="btn secondary" style={{marginTop:14}}>คัดลอกรหัสผ่าน</button></div>
      <div className="card"><h3>📦 ที่อยู่รับพัสดุ</h3><p className="lead" style={{fontSize:15}}>สมชาย ใจดี · ห้อง A201<br/>StayHub Residence<br/>กรุงเทพฯ 10240</p><button className="btn secondary">คัดลอกที่อยู่</button></div>
    </section>

    <section className="section splitGrid">
      <div className="card"><h3>🗝️ รับมอบห้อง</h3><div className="infoRow"><span className="muted">วันที่เข้าอยู่</span><strong>1 ม.ค. 2567</strong></div><div className="infoRow"><span className="muted">กุญแจ</span><strong>2 ดอก</strong></div><div className="infoRow"><span className="muted">Key Card</span><strong>2 ใบ</strong></div></div>
      <div className="card"><h3>🛏️ ทรัพย์สินประจำห้อง</h3><div className="infoRow"><span className="muted">ทั้งหมด</span><strong>12 รายการ</strong></div><div className="infoRow"><span className="muted">ปกติ</span><strong>12</strong></div><div className="infoRow"><span className="muted">ผิดปกติ</span><strong>0</strong></div></div>
    </section>

    <section className="section card"><h3>☎️ ติดต่อหอ</h3><div className="infoRow"><span className="muted">สำนักงาน</span><strong>02-123-4567</strong></div><div className="infoRow"><span className="muted">รปภ.</span><strong>081-234-5678</strong></div></section>

    <section id="repair" className="section card noticeBox"><strong>หน้าจอนี้เป็น Preview จาก React/CSS จริงของ repository</strong><p className="muted">ข้อมูลในหน้านี้เป็นข้อมูลตัวอย่างเพื่อให้ตรวจ layout เท่านั้น หน้าใช้งานจริงจะอ่านข้อมูลจาก Supabase ตาม profile → active lease → room และการส่งข้อมูลจริงอยู่ที่ “แจ้งซ่อม”</p></section>
  </main>
}
