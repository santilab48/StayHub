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

    <section className="myRoomPrimaryActions section">
      <a className="repairPrimary" href="#repair"><span className="repairPrimaryIcon">🔧</span><span><strong>แจ้งซ่อม</strong><small>ส่งรายละเอียดปัญหาและรูปให้เจ้าของหอ</small></span><b>›</b></a>
      <a className="emergencyPrimary" href="#emergency"><span className="repairPrimaryIcon">🚕</span><span><strong>ฉุกเฉิน / เรียกรถ</strong><small>เปิดบริการช่วยเหลือและเรียกรถ</small></span><b>›</b></a>
    </section>

    <section className="section"><h2>ทางลัดของห้อง</h2><div className="grid roomMenu">
      <a className="card tile" href="#contract"><span className="icon">📄</span><div><h3>สัญญา PDF</h3><p className="muted">เปิดเอกสารฉบับสมบูรณ์</p></div></a>
      <a className="card tile" href="#rules"><span className="icon">📘</span><div><h3>กฎระเบียบหอ</h3><p className="muted">อ่านกฎและข้อปฏิบัติจากเจ้าของ</p></div></a>
      <a className="card tile" href="#occupants"><span className="icon">👥</span><div><h3>ผู้พัก</h3><p className="muted">ผู้พักที่ได้รับอนุมัติ</p></div></a>
      <a className="card tile" href="#vehicles"><span className="icon">🚗</span><div><h3>รถของฉัน</h3><p className="muted">ทะเบียนที่ผูกกับห้อง</p></div></a>
    </div></section>

    <section className="section card"><div className="toolbar"><div><h3>📦 พัสดุรอรับ 2 ชิ้น</h3><p className="muted">รายการล่าสุดมาถึงวันนี้</p></div><a className="btn secondary" href="#parcels">ดูพัสดุ</a></div></section>

    <section className="section splitGrid">
      <div className="card"><h3>🏠 ข้อมูลห้อง</h3><div className="infoRow"><span className="muted">เลขห้อง</span><strong>A201</strong></div><div className="infoRow"><span className="muted">อาคาร / ชั้น</span><strong>A / 2</strong></div><div className="infoRow"><span className="muted">สถานะ</span><strong>ปกติ</strong></div></div>
      <div id="contract" className="card"><h3>📄 สัญญาปัจจุบัน</h3><div className="infoRow"><span className="muted">เริ่ม</span><strong>1 ม.ค. 2567</strong></div><div className="infoRow"><span className="muted">สิ้นสุด</span><strong>31 ธ.ค. 2567</strong></div><div className="infoRow"><span className="muted">เงินประกัน</span><strong>11,000 บาท</strong></div><button className="btn" style={{marginTop:14}}>เปิดสัญญา PDF</button></div>
    </section>

    <section id="rules" className="section card"><div className="toolbar"><div><h3>📘 กฎระเบียบหอพัก</h3><p className="muted">เอกสารจากเจ้าของหอ เช่น เวลาเข้าออก การใช้พื้นที่ส่วนกลาง ขยะ เสียงดัง และข้อห้ามต่าง ๆ</p></div><button className="btn secondary">เปิดอ่านกฎระเบียบ</button></div></section>

    <section className="section splitGrid">
      <div className="card"><h3>📶 Wi‑Fi ห้อง</h3><div className="infoRow"><span className="muted">ชื่อเครือข่าย</span><strong>StayHub_A201</strong></div><div className="infoRow"><span className="muted">รหัสผ่าน</span><strong>••••••••</strong></div><button className="btn secondary" style={{marginTop:14}}>คัดลอกรหัสผ่าน</button></div>
      <div className="card"><h3>📦 ที่อยู่รับพัสดุ</h3><p className="lead" style={{fontSize:15}}>สมชาย ใจดี · ห้อง A201<br/>StayHub Residence<br/>กรุงเทพฯ 10240</p><button className="btn secondary">คัดลอกที่อยู่</button></div>
    </section>

    <section className="section splitGrid">
      <div className="card"><h3>🗝️ รับมอบห้อง</h3><div className="infoRow"><span className="muted">วันที่เข้าอยู่</span><strong>1 ม.ค. 2567</strong></div><div className="infoRow"><span className="muted">กุญแจ</span><strong>2 ดอก</strong></div><div className="infoRow"><span className="muted">สภาพตอนรับมอบ</span><strong>ปกติ</strong></div></div>
      <div className="card"><h3>🛏️ ทรัพย์สินประจำห้อง</h3><div className="infoRow"><span className="muted">ทั้งหมด</span><strong>12 รายการ</strong></div><div className="infoRow"><span className="muted">ปกติ</span><strong>12</strong></div><div className="infoRow"><span className="muted">ผิดปกติ</span><strong>0</strong></div></div>
    </section>

    <section className="section card"><h3>☎️ ติดต่อหอ</h3><div className="infoRow"><span className="muted">สำนักงาน</span><strong>02-123-4567</strong></div><div className="infoRow"><span className="muted">รปภ.</span><strong>081-234-5678</strong></div><div className="infoRow"><span className="muted">ฉุกเฉิน</span><strong>1669 / เบอร์หอ</strong></div></section>

    <section id="emergency" className="section card"><div className="toolbar"><div><h3>🚕 ฉุกเฉิน / เรียกรถ</h3><p className="muted">ทางลัดสำหรับกรณีฉุกเฉินหรือเมื่อต้องการเรียกรถจากบริการที่หอกำหนด</p></div><button className="btn">เปิดบริการ</button></div></section>

    <section id="repair" className="section card noticeBox"><strong>หน้าจอนี้เป็น Preview จาก React/CSS จริงของ repository</strong><p className="muted">ข้อมูลเป็นตัวอย่างเพื่อดู layout เท่านั้น หน้าใช้งานจริงอ่านจาก Supabase และจุดส่งข้อมูลหลักคือ “แจ้งซ่อม”</p></section>
  </main>
}
