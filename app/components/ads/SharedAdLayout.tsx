'use client'
import {useCallback,useEffect,useState,type ReactNode} from 'react'
import {adConfig,providerHosts,validatedBannerUrl} from '../../../lib/ad-config'
import ContentBanner from './ContentBanner'
import RightBanner from './RightBanner'
import BottomBanner from './BottomBanner'
import css from './ads.module.css'

export default function SharedAdLayout({children,enabled=true}:{children:ReactNode;enabled?:boolean}){
  const [online,setOnline]=useState(false)
  const [runtimeMock,setRuntimeMock]=useState(false)
  const [runtimeLive,setRuntimeLive]=useState(false)
  const [hosts,setHosts]=useState<string[]>([])
  const [slots,setSlots]=useState({left:true,right:true,bottom:true})
  const [urls,setUrls]=useState<{content:string|null;right:string|null;bottom:string|null}>({content:null,right:null,bottom:null})
  const [failed,setFailed]=useState<string[]>([])
  const [wide,setWide]=useState(false)
  const [dialogOpen,setDialogOpen]=useState(false)
  useEffect(()=>{
    const width=window.matchMedia('(min-width: 1280px)')
    const update=()=>{setOnline(navigator.onLine);setWide(width.matches)}
    const checkDialog=()=>setDialogOpen(Boolean(document.querySelector('dialog[open],[role="dialog"],[aria-modal="true"]')))
    update();checkDialog()
    setRuntimeMock(document.documentElement.dataset.adMock==='true')
    setRuntimeLive(document.documentElement.dataset.adLive==='true')
    const allowed=providerHosts(document.documentElement.dataset.adHosts)
    setHosts(allowed)
    setSlots({left:document.documentElement.dataset.adEnableLeft!=='false',
      right:document.documentElement.dataset.adEnableRight!=='false',
      bottom:document.documentElement.dataset.adEnableBottom!=='false'})
    setUrls({content:validatedBannerUrl(document.documentElement.dataset.adLeftUrl,allowed),
      right:validatedBannerUrl(document.documentElement.dataset.adRightUrl,allowed),
      bottom:validatedBannerUrl(document.documentElement.dataset.adBottomUrl,allowed)})
    width.addEventListener('change',update)
    window.addEventListener('online',update);window.addEventListener('offline',update)
    const observer=new MutationObserver(checkDialog)
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','role','aria-modal']})
    return()=>{width.removeEventListener('change',update);window.removeEventListener('online',update);window.removeEventListener('offline',update);observer.disconnect()}
  },[])
  const onFailed=useCallback((kind:'content'|'right'|'bottom')=>setFailed(old=>old.includes(kind)?old:[...old,kind]),[])
  const mock=runtimeMock||adConfig.mock
  const contentLive=runtimeLive&&adConfig.contentLive&&!!urls.content
  const rightLive=runtimeLive&&adConfig.rightLive&&!!urls.right
  const bottomLive=runtimeLive&&adConfig.bottomLive&&!!urls.bottom
  const left=wide&&slots.left&&(mock||contentLive)&&!failed.includes('content')
  const right=wide&&slots.right&&(mock||rightLive)&&!failed.includes('right')
  const bottom=slots.bottom&&(mock||bottomLive)&&!failed.includes('bottom')
  if(!enabled||!online||dialogOpen||(!left&&!right&&!bottom))return <>{children}</>
  return <div className={css.layout} data-shared-ad-layout={(left&&contentLive)||(right&&rightLive)||(bottom&&bottomLive)?'live':'mock'} data-side-ads={left&&right?'both':left?'left':right?'right':'none'}>
    {left&&<aside className={css.left} aria-label="โฆษณาด้านซ้าย"><ContentBanner live={contentLive} url={urls.content??undefined} allowedHosts={hosts} onFailed={onFailed}/></aside>}
    <div className={css.main}>{children}</div>
    {right&&<aside className={css.right} aria-label="โฆษณาด้านขวา"><RightBanner live={rightLive} url={urls.right??undefined} allowedHosts={hosts} onFailed={onFailed}/></aside>}
    {bottom&&<aside className={css.bottom} aria-label="โฆษณาด้านล่าง"><BottomBanner live={bottomLive} url={urls.bottom??undefined} allowedHosts={hosts} onFailed={onFailed}/></aside>}
  </div>
}
