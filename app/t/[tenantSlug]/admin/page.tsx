import AdminShell from '../../../../components/AdminShell'
import AdminVacancyMetric from '../../../../components/AdminVacancyMetric'
import { tenantRoutes } from '../../../../lib/routes'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  const tasks=[
    ['💸','ค่าห้องค้าง','— ห้อง','ดูผู้เช่าที่ยังค้างชำระ',r.adminBillingTab],
    ['🔧','งานซ่อมรอดำเนินการ','— งาน','ดูงานที่ยังไม่เสร็จ',r.adminRepairs],
    ['🧾','บิลที่ต้องออก','— ห้อง','ห้องที่มีมิเตอร์ยืนยันแล้วแต่ยังไม่มีบิลรอบนี้',r.adminBillingTab],
    ['✅','สลิปรอตรวจ','— รายการ','กดรับหรือปฏิเสธการชำระ',r.adminFinancePayments],
    ['📝','สัญญาใกล้หมด','— ห้อง','เตรียมต่อสัญญาหรือย้ายออก',r.adminContractsTab],
    ['📦','พัสดุรอรับนาน','— ชิ้น','ตรวจรายการพัสดุที่ยังไม่รับ',r.adminParcels]
  ]
  return <AdminShell slug={tenantSlug} title="สิ่งที่ต้องทำ">
    <section className="card"><div className="toolbar"><div><span className="eyebrow">TODAY</span><h2>งานที่ควรจัดการวันนี้</h2><p className="muted">หน้าแรกของเจ้าของหอ แสดงเฉพาะสิ่งที่ต้องลงมือทำ ไม่เอารายงานทั่วไปมาปน</p></div><span className="pill warn">เรียงตามความเร่งด่วน</span></div></section>
    <div className="metricGrid section"><AdminVacancyMetric/><div className="metric"><span className="muted">ค้างชำระ</span><strong>—</strong></div><div className="metric"><span className="muted">งานซ่อม</span><strong>—</strong></div><div className="metric"><span className="muted">สลิปรอตรวจ</span><strong>—</strong></div></div>
    <section className="section grid">{tasks.map(([icon,title,count,detail,href])=><a className="card tile" href={href} key={title}><span className="icon">{icon}</span><div><div className="toolbar"><h3>{title}</h3><strong>{count}</strong></div><p className="muted">{detail}</p></div></a>)}</section>
    <section className="section card noticeBox"><strong>สิ่งที่ต้องทำเพิ่มเติม</strong><p className="muted">ภายหลังเจ้าของสามารถเพิ่มเตือนเอง เช่น นัดช่าง, นัดตรวจห้อง, ต่อประกัน, ซื้อของส่วนกลาง หรือเตือนเฉพาะวันได้ โดยเก็บเป็นงาน ไม่ปนกับประกาศผู้เช่า</p></section>
  </AdminShell>
}
