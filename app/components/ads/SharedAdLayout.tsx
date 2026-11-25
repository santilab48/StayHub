'use client'
import {useEffect,useState,type ReactNode} from 'react'
import {adConfig} from '../../../lib/ad-config'
import ContentBanner from './ContentBanner'
import InPagePush from './InPagePush'
import BottomBanner from './BottomBanner'
import css from './ads.module.css'

export default function SharedAdLayout({children,enabled=true}:{children:ReactNode;enabled?:boolean}){
  const [online,setOnline]=useState(false)
  const [wide,setWide]=useState(false)
  const [dialogOpen,setDialogOpen]=useState(false)
  useEffect(()=>{
    const width=window.matchMedia('(min-width: 1600px)')
    const update=()=>{setOnline(navigator.onLine);setWide(width.matches)}
    const checkDialog=()=>setDialogOpen(Boolean(document.querySelector('dialog[open],[role="dialog"],[aria-modal="true"]')))
    update();checkDialog()
    width.addEventListener('change',update)
    window.addEventListener('online',update);window.addEventListener('offline',update)
    const observer=new MutationObserver(checkDialog)
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','role','aria-modal']})
    return()=>{width.removeEventListener('change',update);window.removeEventListener('online',update);window.removeEventListener('offline',update);observer.disconnect()}
  },[])
  if(!enabled||!adConfig.mock||!online||dialogOpen)return <>{children}</>
  return <div className={css.layout} data-shared-ad-layout="mock">
    {wide&&<aside className={css.left} aria-label="โฆษณาด้านซ้าย"><ContentBanner/></aside>}
    <div className={css.main}>{children}</div>
    {wide&&<aside className={css.right} aria-label="โฆษณาด้านขวา"><InPagePush/></aside>}
    <aside className={css.bottom} aria-label="โฆษณาด้านล่าง"><BottomBanner/></aside>
  </div>
}
