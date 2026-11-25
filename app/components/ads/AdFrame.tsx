'use client'
import {useEffect,useRef,useState} from 'react'
import css from './ads.module.css'

type Props={title:string;width:number;height:number;kind:'content'|'push'|'bottom'}
export default function AdFrame({title,width,height,kind}:Props){
  const host=useRef<HTMLDivElement>(null)
  const [visible,setVisible]=useState(false)
  useEffect(()=>{
    if(!host.current||!('IntersectionObserver' in window)){setVisible(true);return}
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}
    },{rootMargin:'160px'})
    observer.observe(host.current)
    return()=>observer.disconnect()
  },[])
  return <div ref={host} className={css.frame} style={{width,maxWidth:'100%',minHeight:height}} data-ad-slot={kind}>
    {visible&&<iframe title={title} width={width} height={height} className={css.iframe}
      sandbox="" referrerPolicy="no-referrer" loading="lazy" srcDoc={`<!doctype html><html lang="th"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>*{box-sizing:border-box}body{margin:0;height:100vh;display:grid;place-items:center;background:linear-gradient(145deg,#243147,#141c2d);color:#f4f8ff;font:15px system-ui,sans-serif;text-align:center;border:1px solid #40516b;border-radius:16px}.label{color:#ffb36b;font-weight:700;font-size:12px;letter-spacing:.08em}.title{margin-top:10px;font-size:19px;font-weight:750}.note{margin-top:7px;color:#b7c8de;font-size:12px}</style></head><body><div><div class="label">โฆษณา · ตัวอย่าง</div><div class="title">StayHub</div><div class="note">พื้นที่สื่อ ${kind==='push'?'ด้านขวา':kind==='bottom'?'ด้านล่าง':'ด้านซ้าย'}</div></div></body></html>`}/>}
  </div>
}
