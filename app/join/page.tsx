'use client'
import {Suspense,useEffect,useState} from 'react'
import {useSearchParams} from 'next/navigation'
function JoinContent(){
  const params=useSearchParams()
  const token=params.get('token')||''
  const [item,setItem]=useState<{name:string;property_type:string;unit_name:string|null}|null>(null)
  const [status,setStatus]=useState('')
  const [busy,setBusy]=useState(false)
  useEffect(()=>{
    if(!token){setStatus('ลิงก์คำเชิญไม่ถูกต้อง');return}
    fetch('/api/v2/invite?token='+encodeURIComponent(token),{cache:'no-store'}).then(async r=>{
      const data=await r.json()
      if(!r.ok)throw Error(data.error)
      setItem(data)
    }).catch(e=>setStatus(e instanceof Error?e.message:'เปิดคำเชิญไม่ได้'))
  },[token])
  async function join(){
    setBusy(true)
    try{
      const r=await fetch('/api/v2/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})})
      const data=await r.json()
      if(!r.ok)throw Error(data.error)
      setStatus('ส่งคำขอเข้าร่วมแล้ว รอเจ้าของที่พักอนุมัติห้องก่อนใช้งาน เปิดแผงได้หลังอนุมัติ')
    }catch(e){setStatus(e instanceof Error?e.message:'กรุณาเข้าสู่ระบบก่อน')}finally{setBusy(false)}
  }
  return <main className="wrap" style={{maxWidth:600}}><a href="/">← StayHub</a>
    <section className="card section"><h1>เข้าร่วมที่พัก</h1>
      {item&&<><h2>{item.name}</h2><p>ห้องที่เชิญ: {item.unit_name||'เจ้าของจะระบุภายหลัง'}</p>
        <p className="muted">QR นี้ใช้ส่งคำขอเข้าร่วม ไม่ใช่สิทธิ์เข้าถึงบิลหรือข้อมูลห้องโดยตรง</p>
        <button className="btn" disabled={busy} onClick={()=>void join()}>ยืนยันขอเข้าร่วม</button>
        <p><a href={'/cloud?return='+encodeURIComponent('/join?token='+encodeURIComponent(token))}>ยังไม่มีบัญชี? สมัครหรือเข้าสู่ระบบเพื่อเข้าร่วม</a></p></>}
      {status&&<p role="status">{status} <a href="/my">เปิดแผงผู้เช่า</a></p>
    </section>
  </main>
}
export default function JoinPage(){return <Suspense fallback={<main>กำลังเปิดคำเชิญ...</main>}><JoinContent/></Suspense>}
