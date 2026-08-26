import TenantShell from '../../../../../components/TenantShell'

const Status=({label,active=false}:{label:string;active?:boolean})=><span className={active?'pill':'pill off'}>{label}</span>

export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){
  const {tenantSlug}=await params
  return <TenantShell slug={tenantSlug} title="แจ้งซ่อม">
    <section className="card">
      <div className="toolbar"><div><span className="eyebrow">REPAIR</span><h2>แจ้งปัญหาห้องของฉัน</h2><p className="muted">แจ้งครั้งเดียวแล้วติดตามสถานะในหน้านี้ เจ้าของเห็นงานใหม่ในแท็บ “สิ่งที่ต้องทำ”</p></div><span className="pill">เฉพาะห้องของฉัน</span></div>
    </section>

    <section className="section card">
      <h3>แจ้งซ่อมใหม่</h3>
      <div className="formGrid">
        <label>ประเภทปัญหา<select><option>ไฟฟ้า</option><option>ประปา</option><option>แอร์</option><option>อินเทอร์เน็ต</option><option>ประตู / กุญแจ</option><option>เฟอร์นิเจอร์</option><option>ห้องน้ำ</option><option>อื่น ๆ</option></select></label>
        <label>ความเร่งด่วน<select><option>ปกติ</option><option>เร่งด่วน</option></select></label>
        <label className="span2">รายละเอียด<textarea rows={4} placeholder="เช่น แอร์ไม่เย็น มีน้ำหยดจากเครื่อง ตั้งแต่เมื่อคืน"/></label>
        <label>เวลาที่สะดวกให้เข้าซ่อม<input placeholder="เช่น 18:00–20:00"/></label>
        <label>เข้าห้องได้เมื่อไม่อยู่หรือไม่<select><option>ต้องมีผู้เช่าอยู่</option><option>อนุญาตให้เจ้าหน้าที่เข้าซ่อมได้</option></select></label>
        <label className="span2">รูปประกอบ<input type="file" accept="image/*" multiple/></label>
      </div>
      <div className="section"><button className="btn">ส่งเรื่องซ่อม</button></div>
    </section>

    <section className="section card">
      <div className="toolbar"><div><h3>งานที่กำลังดำเนินการ</h3><p className="muted">เมื่อเจ้าของเปลี่ยนสถานะ ผู้เช่าเห็นความคืบหน้าตรงนี้ และภายหลังส่งแจ้งเตือน LINE ได้</p></div><span className="pill warn">— งาน</span></div>
      <div className="flow section"><Status label="ส่งเรื่อง" active/><span>→</span><Status label="รับงาน"/><span>→</span><Status label="นัดหมาย"/><span>→</span><Status label="กำลังซ่อม"/><span>→</span><Status label="เสร็จแล้ว"/></div>
      <div className="infoRow"><span className="muted">รายการล่าสุด</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">ช่าง / ผู้รับผิดชอบ</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">เวลานัด</span><strong>—</strong></div>
      <div className="infoRow"><span className="muted">หมายเหตุจากเจ้าของ</span><strong>—</strong></div>
    </section>

    <section className="section card"><div className="toolbar"><div><h3>ประวัติแจ้งซ่อม</h3><p className="muted">เก็บรายการเดิมไว้เป็นประวัติ ไม่ลบเมื่อปิดงาน</p></div><button className="btn secondary">ดูประวัติทั้งหมด</button></div></section>
  </TenantShell>
}
