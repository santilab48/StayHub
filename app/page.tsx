const menus = [
  ['🏠','ห้องของฉัน','ข้อมูลห้อง • ผู้เช่า • สัญญา Paperless','/tenant/room'],
  ['💳','บิล & ชำระ','ค่าเช่า • น้ำไฟ • สลิป • ใบเสร็จ','/tenant/billing'],
  ['🔧','แจ้งซ่อม','แจ้งปัญหา • รูป • นัดหมาย • ติดตามสถานะ','/tenant/repair'],
  ['📦','บริการ','พัสดุ • รถรับจ้าง • Grab','/tenant/services'],
  ['📢','ข่าวสาร','ประกาศ • กฎ • แจ้งเตือน','/tenant/news'],
  ['⚙️','จัดการหอ','สำหรับเจ้าของหอและพนักงาน','/admin']
]

export default function Home(){
  return <main className="wrap">
    <section className="hero">
      <div>
        <span className="badge">StayHub</span>
        <h1>ทุกเรื่องของหอพัก อยู่ใน LINE ที่เดียว</h1>
        <p className="lead">Web App สำหรับผู้เช่าและเจ้าของหอ ออกแบบให้รองรับหลาย LINE OA โดยข้อมูลของแต่ละหอแยกจากกันตั้งแต่ฐานระบบ</p>
      </div>
      <div className="statusbox"><b>Core status</b><span>Multi-OA ready</span><span>Tenant isolation enabled</span><span>Subscription guard enabled</span></div>
    </section>
    <h2>Rich Menu 6 ช่อง</h2>
    <div className="grid">{menus.map(([i,t,d,h],idx)=><a className={`card tile ${idx===5?'adminTile':''}`} href={h} key={t}><div className="icon">{i}</div><div><h3>{t}</h3><div className="muted">{d}</div></div></a>)}</div>
    <p className="footnote">LINE OA / LIFF จะเชื่อมเป็นขั้นสุดท้าย หลัง Web App และหลังบ้านเสร็จครบ</p>
  </main>
}
