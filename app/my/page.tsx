'use client'
import {useEffect,useState} from 'react'
import PwaInstall from '../../components/PwaInstall'
type Stay={id:string;property_name:string;unit_name:string;property_type:string}
type JoinRequest={id:string;property_name:string;unit_name:string|null;status:'pending'|'approved'|'rejected'}
const tiles=[
  ['🏠','ห้องของฉัน','ข้อมูลห้องและการเข้าพัก'],
  ['🧾','บิลและชำระเงิน','ดูบิลและยอดค้างจากระบบ Cloud'],
  ['🔧','แจ้งซ่อม','รอเปิดระบบแจ้งซ่อมออนไลน์'],
  ['📦','พัสดุและบริการ','รอเปิดระบบบริการ'],
  ['📢','ประกาศ','รอเปิดระบบประกาศ'],
  ['💬','ติดต่อที่พัก','รอเปิดช่องทางติดต่อ'],
]
export default function MyStayPage(){
  const [stays,setStays]=useState<Stay[]>([])
  const [requests,setRequests]=useState<JoinRequest[]>([])
  const [state,setState]=useState('กำลังตรวจสอบสิทธิ์การเข้าพัก...')
  useEffect(()=>{
    fetch('/api/v2/my-stays',{cache:'no-store'})
      .then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Please sign in');setStays(data.items);return fetch('/api/v2/my-requests',{cache:'no-store'})})
      .then(async r=>{const data=await r.json();if(!r.ok)throw Error('Unable to load requests');setRequests(data.items);setState('')})
      .catch(()=>setState('กรุณาเข้าสู่ระบบเพื่อดูพื้นที่ของคุณ'))
  },[])
  return <main className="wrap" style={{maxWidth:900}}>
    <a href="/">← StayHub</a><h1>แผงผู้เข้าพัก</h1>
    <p className="muted">ที่พักและห้องบนแผงนี้ต้องผูกกับ Account ID และ Stay ID ที่เจ้าของอนุมัติแล้วเท่านั้น</p>
    <PwaInstall/>
    <section className="card section"><h2>บิลและยอดค้างย้อนหลัง</h2><p className="muted">ดูบิลของบัญชีนี้ได้แม้ย้ายห้องหรือย้ายออกแล้ว</p><a href="/cloud/billing" className="btn secondary">ดูบิลของฉัน</a></section>
    {state&&<p role="status" className="card">{state} <a href="/cloud">เข้าสู่ระบบ</a></p>}
    {!state&&!stays.length&&<section className="card"><h2>ยังไม่มีห้องที่อนุมัติ</h2><p>สแกน QR ของเจ้าของแล้วส่งคำขอเข้าร่วม หรือรอเจ้าของอนุมัติห้องก่อน</p></section>}
    {!state&&requests.length>0&&<section className="card section"><h2>คำขอเข้าร่วมของฉัน</h2>{requests.map(r=><p key={r.id}>{r.property_name} · {r.unit_name||'รอเลือกห้อง'} · {r.status==='pending'?'รอเจ้าของอนุมัติ':r.status==='approved'?'อนุมัติแล้ว':'ปฏิเสธแล้ว'}</p>)}</section>}
    {stays.map(stay=><section key={stay.id} className="card section">
      <h2>{stay.property_name}</h2><p>ห้อง: <strong>{stay.unit_name}</strong></p>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))'}}>
        {tiles.map(([icon,title,description],i)=>i===1?<a key={title} href="/cloud/billing" className="card tile"><span className="icon">{icon}</span><strong>{title}</strong><p className="muted">{description}</p></a>:<div key={title} className="card tile">
          <span className="icon">{icon}</span><strong>{title}</strong>
          <p className="muted">{i===0?'สิทธิ์ได้รับการยืนยันแล้ว':description}</p>
        </div>)}
      </div>
      <p className="footnote">นี่คือแผงทดสอบ PWA: ฟีเจอร์บริการอื่นจะเปิดทีละส่วนหลังผ่านการตรวจสิทธิ์ ไม่แสดงข้อมูลปลอมหรือข้อมูลห้องอื่น</p>
    </section>)}
  </main>
}
