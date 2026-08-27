export default function MyRoomPreview(){
  return <main className="wrap">
    <section className="roomHero card myRoomHeroReal">
      <div>
        <span className="eyebrow">STAYHUB · ROOM PREVIEW</span>
        <h1 style={{fontSize:34,margin:'8px 0'}}>ห้อง A201</h1>
        <p className="lead" style={{margin:0}}>อาคาร A · ชั้น 2 · ผู้เช่า สมชาย ใจดี</p>
        <div className="flow"><span>สัญญาใช้งานอยู่</span><span>ค่าเช่า 5,500 บาท/เดือน</span><span>สิ้นสุด 31 ธ.ค. 2567</span></div>
      </div>
    </section>

    <a className="repairPrimary" href="#repair"><span className="repairPrimaryIcon">🔧</span><span><strong>แจ้งซ่อม</strong><small>ส่งรายละเอียดปัญหาและรูปให้เจ้าของหอ</small></span><b>›</b></a>

    <section className="section"><h2>ทางลัดของห้อง</h2><div className="grid roomMenu">
      <a className="card tile" href="#nfc"><span className="icon">📱</span><div><h3>NFC เข้า-ออกหอ</h3><p className="muted">แตะเพื่อเปิดสิทธิ์เข้าอาคาร</p></div></a>
      <a className="card tile" href="#contract"><span className="icon">📄</span><div><h3>สัญญา PDF</h3><p className="muted">เปิดเอกสารฉบับสมบูรณ์</p></div></a>
      <a className="card tile" href="#rules"><span className="icon">📘</span><div><h3>กฎระเบียบหอ</h3><p className="muted">อ่านกฎและข้อปฏิบัติจากเจ้าของ</p></div></a>
      <a className="card tile" href="#occupants"><span className="icon">👥</span><div><h3>ผู้พัก</h3><p className="muted">ผู้พักที่ได้รับอนุมัติ</p></div></a>
      <a className="card tile" href="#vehicles"><span className="icon">🚗</span><div><h3>รถของฉัน</h3><p className="muted">ทะเบียนที่ผูกกับห้อง</p></div></a>
    </div></section>

    <section className="section card"><div className="toolbar"><div><h3>📦 พัสดุรอรับ 2 ชิ้น</h3><p className="muted">รายการล่าสุดมาถึงวันนี้</p></div><a className="btn secondary" href="#parcels">ดูพัสดุ</a></div></section>

    <section className="section splitGrid">
      <div className="card"><h3>📶 Wi‑Fi ห้อง</h3><div className="infoRow"><span className="muted">ชื่อเครือข่าย</span><strong>StayHub_A201</strong></div><div className="infoRow"><span className="muted">รหัสผ่าน</span><strong>••••••••</strong></div><button className="btn secondary" style={{marginTop:14}}>คัดลอกรหัสผ่าน</button></div>
      <div className="card"><h3>📦 ที่อยู่รับพัสดุ</h3><p className="lead" style={{fontSize:15}}>สมชาย ใจดี · ห้อง A201<br/>StayHub Residence<br/>กรุงเทพฯ 10240</p><button className="btn secondary">คัดลอกที่อยู่</button></div>
    </section>

    <section className="section card"><h3>🗝️ รับมอบห้องและทรัพย์สิน</h3><div className="infoRow"><span className="muted">วันที่เข้าอยู่</span><strong>1 ม.ค. 2567</strong></div><div className="infoRow"><span className="muted">กุญแจ</span><strong>2 ดอก</strong></div><div className="infoRow"><span className="muted">สภาพตอนรับมอบ</span><strong>ปกติ</strong></div><div className="infoRow"><span className="muted">ทรัพย์สินทั้งหมด</span><strong>12 รายการ</strong></div><div className="infoRow"><span className="muted">รายการผิดปกติ</span><strong>0 รายการ</strong></div></section>

    <section className="section card"><div className="toolbar"><div><h3>☎️ เบอร์โทร</h3><p className="muted">กดชื่อเพื่อโทรออก</p></div></div><a className="infoRow" style={{textDecoration:'none',color:'inherit'}} href="tel:021234567"><span>🏢 สำนักงาน / เจ้าของ</span><strong>แตะเพื่อโทร ›</strong></a><a className="infoRow" style={{textDecoration:'none',color:'inherit'}} href="tel:0812345678"><span>🛡️ รปภ.</span><strong>แตะเพื่อโทร ›</strong></a><a className="infoRow" style={{textDecoration:'none',color:'inherit'}} href="tel:1669"><span>🚨 ฉุกเฉิน</span><strong>แตะเพื่อโทร ›</strong></a></section>

    <section id="nfc" className="section card"><div className="toolbar"><div><h3>📱 NFC เข้า-ออกหอ</h3><p className="muted">สิทธิ์จากเจ้าของหอ ใช้สำหรับเข้าอาคาร</p></div><span className="pill">พร้อมใช้</span></div><div className="infoRow"><span className="muted">สถานะ</span><strong>Active</strong></div><div className="infoRow"><span className="muted">หมดอายุ</span><strong>ไม่กำหนด</strong></div><button className="btn" style={{marginTop:14}}>เปิด NFC ของฉัน</button></section>

    <section id="repair" className="section card noticeBox"><strong>หน้าจอนี้เป็น Preview จาก React/CSS จริงของ repository</strong><p className="muted">ข้อมูลเป็นตัวอย่างเพื่อดู layout เท่านั้น หน้าใช้งานจริงอ่านจาก Supabase และจุดส่งข้อมูลหลักคือ “แจ้งซ่อม”</p></section>
  </main>
}