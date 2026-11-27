'use client'
import {useEffect,useState} from 'react'
interface InstallEvent extends Event{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
export default function PwaInstall(){
  const [prompt,setPrompt]=useState<InstallEvent|null>(null)
  const [installed,setInstalled]=useState(false)
  useEffect(()=>{
    if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{})
    const media=window.matchMedia('(display-mode: standalone)')
    setInstalled(media.matches)
    const onPrompt=(e:Event)=>{e.preventDefault();setPrompt(e as InstallEvent)}
    const onInstalled=()=>{setInstalled(true);setPrompt(null)}
    window.addEventListener('beforeinstallprompt',onPrompt)
    window.addEventListener('appinstalled',onInstalled)
    return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled)}
  },[])
  if(installed)return <p className="muted">✓ เปิดในแอป StayHub ที่ติดตั้งแล้ว</p>
  return <section className="card section">
    <h2>ติดตั้งแผง StayHub บนมือถือ</h2>
    {prompt?<button type="button" className="btn" onClick={async()=>{await prompt.prompt();await prompt.userChoice;setPrompt(null)}}>ติดตั้ง StayHub</button>:<p className="muted">Android: เปิดเมนูเบราว์เซอร์แล้วเลือก «ติดตั้งแอป» หรือ «เพิ่มไปยังหน้าจอหลัก» · iPhone: เปิดผ่าน Safari กดแชร์ แล้วเลือก «เพิ่มไปยังหน้าจอโฮม»</p>}
    <p className="footnote">การติดตั้งไม่ได้ให้สิทธิ์เข้าห้องโดยอัตโนมัติ ต้องมีการอนุมัติและผูก ID ก่อนเสมอ ข้อมูลส่วนตัวเรียกจากเซิร์ฟเวอร์เมื่อออนไลน์</p>
  </section>
}
