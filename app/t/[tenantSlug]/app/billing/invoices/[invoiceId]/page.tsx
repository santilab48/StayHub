import TenantShell from '../../../../../../../components/TenantShell'
import BillingNav from '../../../../../../../components/BillingNav'

const Row=({label,value}:{label:string,value:string})=><div className="infoRow"><span className="muted">{label}</span><strong>{value}</strong></div>

export default async function Page({params}:{params:Promise<{tenantSlug:string;invoiceId:string}>}){
  const {tenantSlug,invoiceId}=await params
  return <TenantShell slug={tenantSlug} title="รายละเอียดบิล">
    <BillingNav slug={tenantSlug}/>
    <section className="card">
      <div className="toolbar"><div><span className="eyebrow">INVOICE</span><h2>รายละเอียดบิล</h2><p className="muted">เปิดจากการ์ด LINE หรือจากประวัติบิล โดยระบบต้องตรวจว่าบิลนี้เป็นของห้องผู้ใช้ก่อนแสดงข้อมูลจริง</p></div><span className="pill">#{invoiceId.slice(0,8)}</span></div>
    </section>
    <section className="section card"><h3>สรุปยอด</h3><Row label="รอบบิล" value="—"/><Row label="ห้อง" value="—"/><Row label="วันครบกำหนด" value="—"/><Row label="สถานะ" value="—"/><Row label="ยอดรวม" value="— บาท"/></section>
    <section className="section card"><h3>รายละเอียดค่าใช้จ่าย</h3><Row label="ค่าเช่า" value="—"/><Row label="ค่าน้ำ" value="—"/><Row label="ค่าไฟ" value="—"/><Row label="ค่าใช้จ่ายอื่น" value="—"/><Row label="ค่าปรับ" value="—"/></section>
    <section className="section card"><div className="toolbar"><div><h3>ชำระเงิน</h3><p className="muted">เมื่อเชื่อมข้อมูลจริง หน้านี้จะแสดงเฉพาะส่วนที่เจ้าของเปิดไว้ใน Bill Template</p></div><a className="btn" href={`/t/${tenantSlug}/app/billing/pay`}>แจ้งชำระ / ส่งสลิป</a></div></section>
  </TenantShell>
}
