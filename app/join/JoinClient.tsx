'use client'
import {useEffect,useState,type FormEvent} from 'react'

type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||
  Boolean((navigator as Navigator&{standalone?:boolean}).standalone)
export default function JoinClient({token}:{token:string}){
  const [installed,setInstalled]=useState(false)
  const [installPrompt,setInstallPrompt]=useState<InstallEvent|null>(null)
  const [roomNumber,setRoomNumber]=useState('')
  const [validInvite,setValidInvite]=useState<boolean|null>(null)
  const [status,setStatus]=useState<'loading'|'ready'|'pending'|'rejected'|'invalid'>('loading')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  useEffect(()=>{
    const isInstalled=standalone();setInstalled(isInstalled)
    if('serviceWorker' in navigator)void navigator.serviceWorker.register('/sw.js').catch(()=>{})
    const onPrompt=(event:Event)=>{event.preventDefault();setInstallPrompt(event as InstallEvent)}
    window.addEventListener('beforeinstallprompt',onPrompt)
    return()=>window.removeEventListener('beforeinstallprompt',onPrompt)
  },[token])
  useEffect(()=>{
    if(installed)return
    if(!/^[A-Za-z0-9_-]{43}$/.test(token)){setValidInvite(false);return}
    let live=true
    void fetch('/api/v2/invite?token='+encodeURIComponent(token),{cache:'no-store'})
      .then(r=>{if(live)setValidInvite(r.ok)})
      .catch(()=>{if(live)setValidInvite(false)})
    return()=>{live=false}
  },[installed,token])
  useEffect(()=>{
    if(!installed)return
    if(!/^[A-Za-z0-9_-]{43}$/.test(token)){setStatus('invalid');return}
    let live=true
    const poll=async()=>{
      try{
        const response=await fetch('/api/v2/tenant-device',{cache:'no-store'})
        const data=await response.json()
        if(!live)return
        if(data.status==='approved'){window.location.replace('/my');return}
        setStatus(data.status==='pending'?'pending':data.status==='rejected'?'rejected':'ready')
      }catch{if(live)setMessage('ตรวจสอบสถานะไม่สำเร็จ กรุณาลองใหม่')}
    }
    void poll()
    const timer=window.setInterval(()=>void poll(),4000)
    return()=>{live=false;window.clearInterval(timer)}
  },[installed,token])
  async function confirmRoom(e:FormEvent){
    e.preventDefault();if(busy)return
    setBusy(true);setMessage('')
    try{
      const response=await fetch('/api/v2/tenant-device',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({token,roomNumber:roomNumber.trim()})})
      if(!response.ok)throw Error(response.status===409?'เลขห้องไม่ตรงกับ QR นี้':'ไม่สามารถส่งคำขอได้ กรุณาตรวจ QR และลองใหม่')
      setStatus('pending');setRoomNumber('')
    }catch(error){setMessage(error instanceof Error?error.message:'ส่งคำขอไม่สำเร็จ')}
    finally{setBusy(false)}
  }
  return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:20,background:'#f4f7fb'}}>
    <div style={{width:'100%',maxWidth:390,textAlign:'center',background:'#fff',borderRadius:24,padding:'38px 24px',boxShadow:'0 12px 36px #16203318'}}>
      <img src="/icons/stayhub.svg" alt="StayHub" width="96" height="96" style={{display:'block',margin:'0 auto 20px'}}/>
      {!installed? validInvite===false?<p role="alert">QR ไม่ถูกต้อง กรุณาขอ QR ใหม่จากที่พัก</p>:installPrompt?
        <button className="btn" style={{width:'100%',minHeight:52}} onClick={async()=>{await installPrompt.prompt();await installPrompt.userChoice;setInstallPrompt(null)}}>ติดตั้งแอป</button>:
        <p>Android: เลือก “ติดตั้งแอป” จากเมนูเบราว์เซอร์<br/>iPhone: เปิดใน Safari แล้วเลือก แชร์ → เพิ่มไปยังหน้าจอโฮม</p>
      : status==='loading'?<p role="status">กำลังตรวจสอบคำเชิญ...</p>
      : status==='invalid'?<p role="alert">กรุณาสแกน QR ประจำห้องอีกครั้ง</p>
      : status==='pending'?<p role="status">รอเจ้าของอนุมัติ</p>
      : status==='rejected'?<p role="status">คำขอไม่ผ่านการอนุมัติ กรุณาติดต่อที่พัก</p>
      : <form onSubmit={e=>void confirmRoom(e)} style={{display:'grid',gap:16}}>
          <label style={{textAlign:'left'}}>เลขห้อง<input autoFocus value={roomNumber} maxLength={80} required autoComplete="off" onChange={e=>setRoomNumber(e.target.value)}/></label>
          <button className="btn" type="submit" disabled={busy} style={{minHeight:52}}>{busy?'กำลังส่งคำขอ...':'ยืนยันเลขห้อง'}</button>
        </form>}
      {installed&&message&&<p role="alert" style={{color:'#b91c1c'}}>{message}</p>}
    </div>
  </main>
}
