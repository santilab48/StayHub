'use client'
import {useCallback,useEffect,useState,type ReactNode} from 'react'
import ContentBanner from './ContentBanner'
import RightBanner from './RightBanner'
import BottomBanner from './BottomBanner'
import AdsenseFrame from './AdsenseFrame'
import css from './ads.module.css'

export default function SharedAdLayout({children,enabled=true}:{children:ReactNode;enabled?:boolean}){
  const [online,setOnline]=useState(false)
  const [runtimeMock,setRuntimeMock]=useState(false)
  const [runtimeLive,setRuntimeLive]=useState(false)
  const [adsense,setAdsense]=useState(false)
  const [adsenseSlots,setAdsenseSlots]=useState({left:null as string|null,right:null as string|null,bottom:null as string|null})
  const [slots,setSlots]=useState({left:true,right:true,bottom:true})
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
    setAdsense(document.documentElement.dataset.adProvider==='adsense')
    setAdsenseSlots({left:document.documentElement.dataset.adsenseLeftSlot??null,right:document.documentElement.dataset.adsenseRightSlot??null,bottom:document.documentElement.dataset.adsenseBottomSlot??null})
    setSlots({left:document.documentElement.dataset.adEnableLeft!=='false',
      right:document.documentElement.dataset.adEnableRight!=='false',
      bottom:document.documentElement.dataset.adEnableBottom!=='false'})
    width.addEventListener('change',update)
    window.addEventListener('online',update);window.addEventListener('offline',update)
    const observer=new MutationObserver(checkDialog)
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','role','aria-modal']})
    return()=>{width.removeEventListener('change',update);window.removeEventListener('online',update);window.removeEventListener('offline',update);observer.disconnect()}
  },[])
  const onFailed=useCallback((kind:'content'|'right'|'bottom')=>setFailed(old=>old.includes(kind)?old:[...old,kind]),[])
  const mock=runtimeMock
  const contentLive=adsense&&runtimeLive&&!!adsenseSlots.left
  const rightLive=adsense&&runtimeLive&&!!adsenseSlots.right
  const bottomLive=adsense&&runtimeLive&&!!adsenseSlots.bottom
  const left=wide&&slots.left&&(mock||contentLive)&&!failed.includes('content')
  const right=wide&&slots.right&&(mock||rightLive)&&!failed.includes('right')
  const bottom=slots.bottom&&(mock||bottomLive)&&!failed.includes('bottom')
  if(!enabled||!online||dialogOpen||(!left&&!right&&!bottom))return <>{children}</>
  return <div className={css.layout} data-shared-ad-layout={(left&&contentLive)||(right&&rightLive)||(bottom&&bottomLive)?'live':'mock'} data-side-ads={left&&right?'both':left?'left':right?'right':'none'}>
    {left&&<aside className={css.left} aria-label="โฆษณาด้านซ้าย">{contentLive?<AdsenseFrame kind="content" slot={adsenseSlots.left!} onFailed={onFailed}/>:<ContentBanner onFailed={onFailed}/>}</aside>}
    <div className={css.main}>{children}</div>
    {right&&<aside className={css.right} aria-label="โฆษณาด้านขวา">{rightLive?<AdsenseFrame kind="right" slot={adsenseSlots.right!} onFailed={onFailed}/>:<RightBanner onFailed={onFailed}/>}</aside>}
    {bottom&&<aside className={css.bottom} aria-label="โฆษณาด้านล่าง">{bottomLive?<AdsenseFrame kind="bottom" slot={adsenseSlots.bottom!} onFailed={onFailed}/>:<BottomBanner onFailed={onFailed}/>}</aside>}
  </div>
}
