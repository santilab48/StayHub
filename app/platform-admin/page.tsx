import {accountFromSession} from '../../lib/cloud-identity'
import {isPlatformAdmin} from '../../lib/db/platform-admin'
import {getNeonMembershipAdminReader} from '../../lib/db/membership-admin-reader'

export const dynamic='force-dynamic'
type Search={searchParams:Promise<{q?:string;page?:string}>}
export default async function PlatformMemberDirectory({searchParams}:Search){
  const acct=await accountFromSession()
  if(!acct)return <main className="wrap" style={{maxWidth:900}}>
    <h1>ผู้ดูแลระบบสมาชิก</h1><section className="card section"><p>กรุณาเข้าสู่ระบบ StayHub</p><a className="btn" href="/cloud?login=1">เข้าสู่ระบบ</a></section>
  </main>
  let allowed=false
  try{allowed=await isPlatformAdmin(acct.id)}catch{}
  if(!allowed)return <main className="wrap" style={{maxWidth:900}}>
    <h1>ผู้ดูแลระบบสมาชิก</h1><section className="card section" role="alert">
      <h2>ไม่มีสิทธิ์เข้าถึง</h2>
      <p>เฉพาะบัญชีผู้ดูแลที่ได้รับอนุมัติและเปิดใช้งานจากฝั่ง Server เท่านั้น</p>
      <a href="/cloud">กลับ StayHub Cloud</a>
    </section></main>
  const params=await searchParams
  const q=(params.q||'').trim().toLowerCase().slice(0,80)
  const requested=Number(params.page||'1')
  const page=Number.isSafeInteger(requested)?Math.max(1,Math.min(4000,requested)):1
  type Member={railway_account_id:string;plan_code:string;status:string;starts_at:Date;ends_at:Date;version:string}
  let members:Member[]=[]
  let unavailable=false
  try{
    const r=await getNeonMembershipAdminReader().query<Member>(`
      SELECT railway_account_id,plan_code,status,starts_at,ends_at,version::text
      FROM stayhub_membership.memberships
      WHERE ($1::text='' OR railway_account_id::text ILIKE '%'||$1||'%' OR plan_code ILIKE '%'||$1||'%')
      ORDER BY updated_at DESC,railway_account_id LIMIT 26 OFFSET $2`,[q,(page-1)*25])
    members=r.rows
  }catch{unavailable=true}
  const link=(next:number)=>'/platform-admin?q='+encodeURIComponent(q)+'&page='+next
  return <main className="wrap" style={{maxWidth:1050}}>
    <a href="/cloud">← StayHub Cloud</a><h1>ระบบจัดการสมาชิก · ผู้ดูแลแพลตฟอร์ม</h1>
    <p className="muted">ข้อมูลแพ็กเกจและสถานะสมาชิกอยู่ใน Neon · หน้านี้อ่านข้อมูลอย่างเดียว ไม่สามารถเพิ่มหรือแก้ไขสิทธิ์ได้</p>
    <section className="card section">
      <h2>ค้นหาสมาชิก</h2>
      <form method="GET" action="/platform-admin" className="flow">
        <input name="q" maxLength={80} defaultValue={q} aria-label="ค้นหารหัสบัญชีหรือรหัสแพ็กเกจ" placeholder="Account UUID หรือรหัสแพ็กเกจ"/>
        <button type="submit" className="btn">ค้นหา</button>
      </form>
      {unavailable?<p role="alert">ไม่สามารถอ่านข้อมูลสมาชิกจาก Neon ได้</p>:members.length===0?<p>ไม่พบสมาชิกที่ตรงกับการค้นหา</p>:<div className="list">
        {members.slice(0,25).map(m=><article className="card section" key={m.railway_account_id}>
          <strong>บัญชี {m.railway_account_id}</strong>
          <p>แพ็กเกจ: {m.plan_code} · สถานะ: {m.status} · รุ่นข้อมูล: {m.version}</p>
          <p>เริ่ม: {new Date(m.starts_at).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'})} · หมดอายุ: {new Date(m.ends_at).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'})}</p>
        </article>)}
      </div>}
      {!unavailable&&<nav className="flow" aria-label="เปลี่ยนหน้ารายการสมาชิก">
        {page>1&&<a className="btn secondary" href={link(page-1)}>ก่อนหน้า</a>}
        <span>หน้า {page}</span>
        {members.length>25&&<a className="btn secondary" href={link(page+1)}>ถัดไป</a>}
      </nav>}
    </section>
    <p className="muted">การอนุมัติ ระงับ หรือต่ออายุสมาชิกต้องใช้ขั้นตอนที่ตรวจตัวตนและบันทึก Audit Log — ยังไม่เปิดแก้ไขผ่านเว็บไซต์</p>
  </main>
}
