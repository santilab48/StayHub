'use client'
import tenant from './tenant.module.css'

export const tenantSections=[
  ['billing','บิลของฉัน'],['repairs','แจ้งซ่อม'],['parcels','พัสดุ'],
  ['announcements','ประกาศ'],['vehicles','รถของห้อง'],['documents','เอกสาร'],
] as const

export default function TenantTabs({propertyId,unitId,current,onPreviewSelect}:{propertyId:string;unitId:string;current?:string;onPreviewSelect?:(key:string)=>void}){
  const query=new URLSearchParams({propertyId,unitId}).toString()
  return <nav className={tenant.tabs} aria-label="เมนูผู้เช่า">
    {tenantSections.map(([key,label])=>onPreviewSelect?<button type="button" key={key} className={tenant.tab} aria-current={current===key?'page':undefined} onClick={()=>onPreviewSelect(key)}>{label}</button>:<a key={key} className={tenant.tab} aria-current={current===key?'page':undefined} href={'/my/'+key+'?'+query}>{label}</a>)}
  </nav>
}
