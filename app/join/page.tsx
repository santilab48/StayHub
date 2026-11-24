'use client'
import {Suspense,useEffect,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import styles from '../cloud/dashboard.module.css'
function JoinContent(){
 const params=useSearchParams()
 const token=params.get('token')||''
 const [item,setItem]=useState<{name:string;property_type:string;unit_name:string|null}|null>(null)
 const [status,setStatus]=useState('')
 const [busy,setBusy]=useState(false)
 const [retry,setRetry]=useState(0)
 useEffect(()=>{
  let live=true
  const controller=new AbortController()
  async function load(){
   if(!token){setStatus('ลิงก์คำเชิญไม่ถูกต้อง');return}
   setBusy(true);setStatus('')
   try{
    const response=await fetch('/api/v2/invite?token='+encodeURIComponent(token),{cache:'no-store',signal:controller.signal})
    const data=await response.json()
    if(!response.ok)throw Error(data.error||'คำเชิญไม่พร้อมใช้งาน')
    if(!live)return
    setItem(data)
    const me=await fetch('/api/v2/me',{cache:'no-store',signal:controller.signal})
    if(me.status===401){if(live)setStatus('กรุณาเข้าสู่ระบบหรือสมัครบัญชีเพื่อผูกห้อง');return}
    if(!me.ok)throw Error('ตรวจสอบบัญชีไม่สำเร็จ')
    const joined=await fetch('/api/v2/join',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),signal:controller.signal})
    const result=await joined.json()
    if(!live)return
    if(joined.ok||result.error==='existing'||result.error==='already_resident'){window.location.replace('/my');return}
    throw Error(result.error==='owner'?'บัญชีเจ้าของไม่สามารถเข้าร่วมเป็นผู้เช่าที่พักของตนเองได้ กรุณาใช้บัญชีผู้เช่า':result.error||'ผูกห้องไม่สำเร็จ')
   }catch(e){if(live)setStatus(e instanceof Error?e.message:'เปิดคำเชิญไม่ได้')}
   finally{if(live)setBusy(false)}
  }
  void load()
  return()=>{live=false;controller.abort()}
 },[token,retry])
 const auth='/cloud?return='+encodeURIComponent('/join?token='+encodeURIComponent(token))
 return <main className={styles.detail}><div className={styles.detailInner} style={{maxWidth:560}}>
  <header className={styles.detailHeader}><strong className={styles.detailBrand}>StayHub <span>Cloud</span></strong></header>
  <section className="card section"><h1>{item?.unit_name?'ห้อง '+item.unit_name:'เข้าร่วมที่พัก'}</h1>
   {item&&<h2>{item.name}</h2>}
   {busy&&<p role="status">กำลังตรวจสอบและส่งคำขอผูกห้องอัตโนมัติ...</p>}
   {status&&<p role="status">{status}</p>}
   {item&&!busy&&<div className="list"><a className="btn" href={auth}>เข้าสู่ระบบ / สมัครสมาชิก</a><button type="button" className="btn secondary" onClick={()=>setRetry(v=>v+1)}>ตรวจสอบการผูกห้องอีกครั้ง</button><a href="/my">เปิดแผงผู้เช่า</a></div>}
   <p className="muted">เจ้าของจะอนุมัติสิทธิ์ก่อนเปิดข้อมูลส่วนตัวและบิล</p>
  </section>
 </div></main>
}
export default function JoinPage(){return <Suspense fallback={<main>กำลังเปิดคำเชิญ...</main>}><JoinContent/></Suspense>}
