import TenantShell from '../../../../../components/TenantShell'
import { tenantRoutes } from '../../../../../lib/routes'

const Info=({label,value}:{label:string,value:string})=><div className="infoRow"><span className="muted">{label}</span><strong>{value}</strong></div>

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  const r=tenantRoutes(tenantSlug)
  const roomNav=[
    ['ภาพรวมห้อง',r.room,'🏠'],
    ['ข้อมูลผู้เช่า',r.roomProfile,'👤'],
    ['สัญญาเช่า',r.contract,'✍️'],
    ['ผู้อยู่อาศัย',r.occupants,'👥'],
    ['รถที่ลงทะเบียน',r.vehicles,'🚗'],
    ['เอกสารห้อง',r.documents,'📄']
  ]
  return <TenantShell slug={tenantSlug} title="ห้องของฉัน">
    <section className="roomHero card">
      <div><span className="eyebrow">MY ROOM</span><h2>ข้อมูลห้องและสัญญาของคุณ</h2><p className="muted">โมดูลนี้เก็บเฉพาะข้อมูลประจำห้องและผู้เช่า ไม่รวมบิล แจ้งซ่อม บริการ หรือข่าวสาร</p></div>
      <span className="pill">เฉพาะบัญชีของฉัน</span>
    </section>

    <div className="metricGrid section">
      <div className="metric"><span className="muted">ห้อง</span><strong>—</strong><small>อาคาร / ชั้น</small></div>
      <div className="metric"><span className="muted">ค่าเช่าตามสัญญา</span><strong>—</strong><small>แสดงข้อมูลเท่านั้น</small></div>
      <div className="metric"><span className="muted">สัญญาสิ้นสุด</span><strong>—</strong><small>พร้อมแจ้งเตือนต่ออายุ</small></div>
      <div className="metric"><span className="muted">เงินประกัน</span><strong>—</strong><small>ยอดตามสัญญา</small></div>
    </div>

    <section className="section">
      <h2>เมนูในห้องของฉัน</h2>
      <div className="grid roomMenu">{roomNav.map(([title,href,icon])=><a className="card tile" href={href} key={href}><span className="icon">{icon}</span><div><h3>{title}</h3><p className="muted">เปิดดูรายละเอียดเฉพาะส่วนนี้</p></div></a>)}</div>
    </section>

    <section className="section splitGrid">
      <div className="card"><h3>ข้อมูลห้อง</h3><Info label="เลขห้อง" value="—"/><Info label="อาคาร" value="—"/><Info label="ชั้น" value="—"/><Info label="สถานะเข้าพัก" value="—"/></div>
      <div className="card"><h3>สรุปสัญญาปัจจุบัน</h3><Info label="วันเริ่มสัญญา" value="—"/><Info label="วันสิ้นสุด" value="—"/><Info label="ค่าเช่ารายเดือน" value="—"/><Info label="เงินประกัน" value="—"/></div>
    </section>

    <section className="section card noticeBox"><strong>การแยกเส้นทาง</strong><p className="muted">การชำระเงินอยู่ที่ “บิล & ชำระ”, งานเสียอยู่ที่ “แจ้งซ่อม”, พัสดุและรถอยู่ที่ “บริการ” และประกาศอยู่ที่ “ข่าวสาร” เพื่อไม่ให้ข้อมูลแต่ละโมดูลทับกัน</p></section>
  </TenantShell>
}
