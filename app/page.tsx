const menus = [
  ['🏠','ห้องของฉัน','สัญญา Paperless • ข้อมูลผู้เช่า','/tenant/room'],
  ['💳','บิล & ชำระ','ค่าเช่า • น้ำไฟ • สลิป • ใบเสร็จ','/tenant/billing'],
  ['🔧','แจ้งซ่อม','แจ้งปัญหา • รูป • นัดหมาย • สถานะ','/tenant/repair'],
  ['📦','บริการ','พัสดุ • เรียกรถ • Grab','/tenant/services'],
  ['📢','ข่าวสาร','ประกาศ • กฎ • แจ้งเตือน','/tenant/news'],
  ['⚙️','จัดการหอ','Admin Dashboard','/admin']
]
export default function Home(){return <main className="wrap"><h1>StayHub</h1><p className="muted">โครง Rich Menu 5 ผู้เช่า + 1 แอดมิน</p><div className="grid">{menus.map(([i,t,d,h])=><a className="card tile" href={h} key={t}><div style={{fontSize:34}}>{i}</div><div><h3 style={{marginBottom:6}}>{t}</h3><div className="muted">{d}</div></div></a>)}</div></main>}
