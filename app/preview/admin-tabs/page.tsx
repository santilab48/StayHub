import AdminShell from '../../../components/AdminShell'

export default function AdminTabsPreview(){
 return <AdminShell slug="demo" title="ทั่วไป">
  <section className="metricGrid">
   <div className="metric"><span className="muted">ห้องทั้งหมด</span><strong>48</strong><small>มีผู้พัก 42 ห้อง</small></div>
   <div className="metric"><span className="muted">งานซ่อมค้าง</span><strong>4</strong><small>มี 1 งานเร่งด่วน</small></div>
   <div className="metric"><span className="muted">พัสดุรอรับ</span><strong>7</strong><small>เกิน 3 วัน 2 ชิ้น</small></div>
   <div className="metric"><span className="muted">สัญญาใกล้หมด</span><strong>3</strong><small>ภายใน 30 วัน</small></div>
  </section>

  <section className="section card"><div className="toolbar"><div><h2>ทั่วไป</h2><p className="muted">ข้อมูลและงานหลังบ้านที่ไม่อยู่ใน 4 แท็บหลัก</p></div><button className="btn">+ เพิ่มข้อมูล</button></div></section>

  <section className="section grid">
   <a className="card tile" href="#"><span className="icon">🏢</span><div><h3>ห้องและข้อมูลผู้พัก</h3><p className="muted">ข้อมูลที่ไปแสดงหน้า ห้องของฉัน, Wi‑Fi, ที่อยู่, รับมอบ และทรัพย์สิน</p></div></a>
   <a className="card tile" href="#"><span className="icon">📱</span><div><h3>NFC / Access</h3><p className="muted">ออกสิทธิ์เข้าอาคาร ดูผู้ถือสิทธิ์ และเพิกถอน</p></div></a>
   <a className="card tile" href="#"><span className="icon">🔧</span><div><h3>แจ้งซ่อมทั้งหมด</h3><p className="muted">รับเรื่อง นัดหมาย ดำเนินงาน และปิดงาน</p></div></a>
   <a className="card tile" href="#"><span className="icon">📦</span><div><h3>พัสดุ</h3><p className="muted">รับพัสดุ บันทึกรูป และสถานะรับของ</p></div></a>
   <a className="card tile" href="#"><span className="icon">📷</span><div><h3>มิเตอร์</h3><p className="muted">จดค่าน้ำไฟ ตรวจข้อมูลก่อนนำไปทำบิล</p></div></a>
   <a className="card tile" href="#"><span className="icon">📢</span><div><h3>ข่าวสาร / ประกาศ</h3><p className="muted">ข้อความที่เจ้าของต้องการให้ผู้พักเห็น</p></div></a>
   <a className="card tile" href="#"><span className="icon">🚕</span><div><h3>รถรับจ้าง / เบอร์โทร</h3><p className="muted">ผู้ให้บริการและเบอร์สำคัญที่ผู้พักกดโทรได้</p></div></a>
   <a className="card tile" href="#"><span className="icon">📊</span><div><h3>รายงาน</h3><p className="muted">รายงานสรุปที่ไม่ใช่งานประจำวัน</p></div></a>
   <a className="card tile" href="#"><span className="icon">⚙️</span><div><h3>ตั้งค่าระบบ</h3><p className="muted">ตั้งค่าหอและการเชื่อมต่อระบบ</p></div></a>
  </section>
  <section className="section card noticeBox"><strong>ตัวอย่างหน้าจอจริงจาก React/CSS ของ StayHub</strong><p className="muted">แท็บทั้ง 5 ใช้ component เดียวกับหน้าเจ้าบ้านจริง ข้อมูลตัวเลขด้านบนเป็นตัวอย่างสำหรับตรวจ layout</p></section>
 </AdminShell>
}
