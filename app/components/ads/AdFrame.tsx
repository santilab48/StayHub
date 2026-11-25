'use client'
import {useEffect,useRef,useState} from 'react'
import {bannerSources} from '../../../lib/ad-config'
import css from './ads.module.css'

type Kind='content'|'right'|'bottom'
type Props={title:string;width:number;height:number;kind:Kind;live?:boolean;onFailed?:(kind:Kind)=>void}
export default function AdFrame({title,width,height,kind,live=false,onFailed}:Props){
  const host=useRef<HTMLDivElement>(null)
  const frame=useRef<HTMLIFrameElement>(null)
  const [visible,setVisible]=useState(false)
  useEffect(()=>{
    if(!host.current||!('IntersectionObserver' in window)){setVisible(true);return}
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}
    },{rootMargin:'160px'})
    observer.observe(host.current)
    return()=>observer.disconnect()
  },[])
  useEffect(()=>{
    if(!live)return
    const handler=(event:MessageEvent)=>{
      if(event.source===frame.current?.contentWindow&&event.data?.type==='stayhub-banner-load-error'&&event.data.kind===kind)onFailed?.(kind)
    }
    window.addEventListener('message',handler)
    return()=>window.removeEventListener('message',handler)
  },[kind,live,onFailed])
  const mockHtml=`<!doctype html><html lang="th"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>*{box-sizing:border-box}body{margin:0;height:100vh;display:grid;place-items:center;background:linear-gradient(145deg,#243147,#141c2d);color:#f4f8ff;font:15px system-ui,sans-serif;text-align:center;border:1px solid #40516b;border-radius:16px}.label{color:#ffb36b;font-weight:700;font-size:12px;letter-spacing:.08em}.title{margin-top:10px;font-size:19px;font-weight:750}.note{margin-top:7px;color:#b7c8de;font-size:12px}</style></head><body><div><div class="label">โฆษณา · ตัวอย่าง</div><div class="title">StayHub</div><div class="note">พื้นที่สื่อ ${kind==='right'?'ด้านขวา':kind==='bottom'?'ด้านล่าง':'ด้านซ้าย'}</div></div><script>document.documentElement.dataset.sandboxProbe=String(location.origin==='null');<\/script></body></html>`
  const liveHtml=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-stayhub-banner' https://shameful-farm.com; style-src 'unsafe-inline'; img-src https://shameful-farm.com data:; connect-src https://shameful-farm.com; frame-src https://shameful-farm.com; base-uri 'none'; form-action 'none'"></head><body style="margin:0"><script nonce="stayhub-banner">const s=document.createElement('script');s.settings={};s.src=${JSON.stringify(bannerSources[kind])};s.async=true;s.referrerPolicy='no-referrer';s.onerror=()=>parent.postMessage({type:'stayhub-banner-load-error',kind:${JSON.stringify(kind)}},'*');document.body.appendChild(s);<\/script></body></html>`
  return <div ref={host} className={css.frame} style={{width,maxWidth:'100%',minHeight:height}} data-ad-slot={kind} data-ad-mode={live?'live':'mock'}>
    {visible&&<iframe ref={frame} title={title} width={width} height={height} className={css.iframe}
      sandbox="allow-scripts" referrerPolicy="no-referrer" loading="lazy" srcDoc={live?liveHtml:mockHtml}/>}
  </div>
}
