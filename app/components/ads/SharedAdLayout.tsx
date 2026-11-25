'use client'
import {useCallback,useEffect,useState,type ReactNode} from 'react'
import {adConfig,validatedBannerUrl} from '../../../lib/ad-config'
import ContentBanner from './ContentBanner'
import RightBanner from './RightBanner'
import BottomBanner from './BottomBanner'
import css from './ads.module.css'

export default function SharedAdLayout({children,enabled=true}:{children:ReactNode;enabled?:boolean}){
  const [online,setOnline]=useState(false)
  const [runtimeMock,setRuntimeMock]=useState(false)
  const [runtimeLive,setRuntimeLive]=useState(false)
  const [urls,setUrls]=useState<{content:string|null;right:string|null;bottom:string|null}>({content:null,right:null,bottom:null})
  const [failed,setFailed]=useState<string[]>([])
  const [wide,setWide]=useState(false)
  const [dialogOpen,setDialogOpen]=useState(false)
  useEffect(()=>{
    const width=window.matchMedia('(min-width: 1600px)')
    const update=()=>{setOnline(navigator.onLine);setWide(width.matches)}
    const checkDialog=()=>setDialogOpen(Boolean(document.querySelector('dialog[open],[role="dialog"],[aria-modal="true"]')))
    update();checkDialog()
    setRuntimeMock(document.documentElement.dataset.adMock==='true')
    setRuntimeLive(document.documentElement.dataset.adLive==='true')
    setUrls({content:validatedBannerUrl(document.documentElement.dataset.adLeftUrl),
      right:validatedBannerUrl(document.documentElement.dataset.adRightUrl),
      bottom:validatedBannerUrl(document.documentElement.dataset.adBottomUrl)})
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
  const sides=wide&&(mock||contentLive)&&(mock||rightLive)&&!failed.includes('content')&&!failed.includes('right')
  const bottom=(mock||bottomLive)&&!failed.includes('bottom')
  if(!enabled||!online||dialogOpen||(!sides&&!bottom))return <>{children}</>
  return <div className={css.layout} data-shared-ad-layout={contentLive||rightLive||bottomLive?'live':'mock'} data-side-ads={sides?'true':'false'}>
    {sides&&<aside className={css.left} aria-label="โฆษณาด้านซ้าย"><ContentBanner live={contentLive} url={urls.content??undefined} onFailed={onFailed}/></aside>}
    <div className={css.main}>{children}</div>
    {sides&&<aside className={css.right} aria-label="โฆษณาด้านขวา"><RightBanner live={rightLive} url={urls.right??undefined} onFailed={onFailed}/></aside>}
    {bottom&&<aside className={css.bottom} aria-label="โฆษณาด้านล่าง"><BottomBanner live={bottomLive} url={urls.bottom??undefined} onFailed={onFailed}/></aside>}
  </div>
}
