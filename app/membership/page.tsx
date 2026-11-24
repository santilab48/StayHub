'use client'
import dashboardStyles from '../cloud/dashboard.module.css'
import {useEffect,useState} from 'react'

type Membership={
  plan:string|null
  status:'trial'|'active'|'expired'|'suspended'|'cancelled'|'none'
  expiresAt:string|null
  entitlements:string[]
}
type View='loading'|'signed-out'|'unavailable'|'ready'
const labels:Record<Membership['status'],string>={
  trial:'อยู่ระหว่างทดลองใช้',active:'ใช้งานอยู่',expired:'หมดอายุ',
  suspended:'ระงับสิทธิ์',cancelled:'ยกเลิกแล้ว',none:'ยังไม่มีแพ็กเกจ'
}
export default function MembershipPage(){
  const [view,setView]=useState<View>('loading')
  const [info,setInfo]=useState<Membership|null>(null)
  const [reload,setReload]=useState(0)
  useEffect(()=>{
    const abort=new AbortController()
    let alive=true
    async function load(){
      try{
        const res=await fetch('/api/v2/membership',{
          method:'GET',credentials:'same-origin',cache:'no-store',
          headers:{'Accept':'application/json'},signal:abort.signal,
        })
        if(!alive)return
        if(res.status===401){setView('signed-out');return}
        if(!res.ok){setView('unavailable');return}
        const payload:unknown=await res.json()
        if(!payload||typeof payload!=='object'||!('membership' in payload)){
          setView('unavailable');return
        }
        const membership=(payload as {membership:Membership}).membership
        if(!membership||!Array.isArray(membership.entitlements)||
           typeof membership.status!=='string'||!(membership.status in labels)){
          setView('unavailable');return
        }
        setInfo(membership);setView('ready')
      }catch(e){
        if(!alive||abort.signal.aborted)return
        setView('unavailable')
      }
    }
    void load()
    return()=>{alive=false;abort.abort()}
  },[reload])
  return <main className={dashboardStyles.detail}><div className={dashboardStyles.detailInner}>
    <header className={dashboardStyles.detailHeader}><a className={dashboardStyles.detailBrand} href="/cloud?tab=membership">StayHub <span>Cloud</span></a><a className={dashboardStyles.back} href="/cloud?tab=membership">กลับหน้าจัดการ</a></header>
    <h1>สมาชิกและสิทธิพิเศษ</h1>
    <p className="muted">ข้อมูลแพ็กเกจและสิทธิพิเศษจัดเก็บใน Neon ส่วนบัญชีและข้อมูลที่พักยังอยู่ใน Railway</p>
    <section className="card section" aria-live="polite">
      {view==='loading'&&<p role="status">กำลังตรวจสอบสถานะสมาชิก...</p>}
      {view==='signed-out'&&<>
        <h2>กรุณาเข้าสู่ระบบ</h2>
        <p>ลงชื่อเข้าใช้บัญชี StayHub เพื่อดูข้อมูลสมาชิกของคุณ</p>
        <a href="/cloud?login=1" className="btn">เข้าสู่ระบบ</a>
      </>}
      {view==='unavailable'&&<>
        <h2>ยังตรวจสอบสถานะสมาชิกไม่ได้</h2>
        <p role="alert">ไม่สามารถเชื่อมต่อระบบสมาชิกได้ในขณะนี้ สิทธิพิเศษยังไม่ถูกยืนยัน</p>
        <button type="button" className="btn secondary" onClick={()=>{setInfo(null);setView('loading');setReload(n=>n+1)}}>ลองอีกครั้ง</button>
      </>}
      {view==='ready'&&info&&<>
        <h2>สถานะ: {labels[info.status]}</h2>
        <p>แพ็กเกจ: <strong>{info.plan||'ยังไม่มีแพ็กเกจ'}</strong></p>
        {info.expiresAt&&<p>สิ้นสุดสิทธิ์: <time dateTime={info.expiresAt}>{new Date(info.expiresAt).toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Bangkok'})}</time></p>}
        <h3>สิทธิพิเศษที่ใช้งานได้</h3>
        {info.entitlements.length
          ?<ul>{info.entitlements.map(code=><li key={code}>{code}</li>)}</ul>
          :<p className="muted">ยังไม่มีสิทธิพิเศษที่เปิดใช้งานสำหรับบัญชีนี้</p>}
        <p className="muted">การมีแพ็กเกจไม่เปลี่ยนสิทธิ์ Owner, Tenant หรือ Property Admin ของที่พัก</p>
        <button type="button" className="btn secondary" onClick={()=>{setView('loading');setReload(n=>n+1)}}>ตรวจสอบอีกครั้ง</button>
      </>}
    </section>
    <p className="muted">การต่ออายุและเปิดสิทธิ์พิเศษต้องได้รับอนุมัติจากผู้ดูแล ไม่สามารถเพิ่มสิทธิ์ด้วยตนเองผ่านหน้านี้</p>
  </div></main>
}
