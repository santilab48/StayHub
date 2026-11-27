'use client'
import {useEffect,useRef,useState} from 'react'
import {adsenseClientId,validAdsenseSlot} from '../../../lib/ad-config'
import css from './ads.module.css'

/** Google display unit in its real size. No zoom, CSS transform, or Auto Ads. */
export default function AdsenseFrame({kind,slot,onFailed}:{kind:'content'|'right'|'bottom';slot:string;onFailed?:(kind:'content'|'right'|'bottom')=>void}){
  const host=useRef<HTMLDivElement>(null)
  const [visible,setVisible]=useState(false)
  const valid=validAdsenseSlot(slot)
  const side=kind!=='bottom'
  const width=side?180:300
  const height=side?150:250
  useEffect(()=>{
    if(!host.current||!('IntersectionObserver' in window)){setVisible(true);return}
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'160px'})
    observer.observe(host.current)
    return()=>observer.disconnect()
  },[])
  useEffect(()=>{
    const handler=(event:MessageEvent)=>{
      if(event.source===host.current?.querySelector('iframe')?.contentWindow&&event.data?.type==='stayhub-adsense-load-error')onFailed?.(kind)
    }
    window.addEventListener('message',handler)
    return()=>window.removeEventListener('message',handler)
  },[kind,onFailed])
  if(!valid)return null
  // Keep Google code in an opaque-origin sandbox, separate from session and business DOM.
  // The upstream ad script may need extra permissions; live rendering requires a separate review.
  const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net; style-src 'unsafe-inline'; img-src https: data:; connect-src https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net; frame-src https:; base-uri 'none'; form-action 'none'"></head><body style="margin:0"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}" crossorigin="anonymous" onerror="parent.postMessage({type:'stayhub-adsense-load-error'},'*')"><\/script><ins class="adsbygoogle" style="display:inline-block;width:${width}px;height:${height}px" data-ad-client="${adsenseClientId}" data-ad-slot="${valid}"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});<\/script></body></html>`
  return <div ref={host} className={css.frame} style={{width,height}} data-ad-slot={kind} data-ad-mode="live"><span className={css.label}>โฆษณา</span>{visible&&<iframe title={`โฆษณา${kind}`} width={width} height={height} className={css.iframe} sandbox="allow-scripts" referrerPolicy="no-referrer" loading="lazy" srcDoc={html}/>}</div>
}
