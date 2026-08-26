import AdminShell from '../../../../components/AdminShell'
import AdminVacancyMetric from '../../../../components/AdminVacancyMetric'
import AdminTaskMetrics from '../../../../components/AdminTaskMetrics'
import {tenantRoutes} from '../../../../lib/routes'

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
 const {tenantSlug}=await params;const r=tenantRoutes(tenantSlug)
 const tasks=[['💸','ค่าห้องค้าง','ดูผู้เช่าที่ยังค้างชำระ',r.adminBillingTab],['🔧','งานซ่อมรอดำเนินการ','รับงาน นัดหมาย ทำเสร็จ และปิดงาน',r.adminRepairs],['🧾','บิลที่ต้องออก','ห้องที่ยังไม่มีบิลของเดือนปัจจุบัน',r.adminBillingTab],['✅','สลิปรอตรวจ','กดรับหรือปฏิเสธการชำระ',r.adminFinancePayments],['📝','สัญญาใกล้หมด','สัญญาที่หมดภายใน 30 วัน',r.adminContractsTab],['📦','พัสดุรอรับนาน','พัสดุที่รอรับเกิน 3 วัน',r.adminParcels]]
 return <AdminShell slug={tenantSlug} title="สิ่งที่ต้องทำ">
  <section className="card"><div className="toolbar"><div><span className="eyebrow">TODAY</span><h2>งานที่ควรจัดการวันนี้</h2><p className="muted">แสดงเฉพาะรายการที่ต้องลงมือทำ โดยตัวเลขดึงจากข้อมูลจริง</p></div><span className="pill warn">LIVE</span></div></section>
  <div className="metricGrid section"><AdminVacancyMetric/></div>
  <AdminTaskMetrics/>
  <section className="section grid">{tasks.map(([icon,title,detail,href])=><a className="card tile" href={href} key={title}><span className="icon">{icon}</span><div><h3>{title}</h3><p className="muted">{detail}</p></div></a>)}</section>
 </AdminShell>
}
