'use client'
import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { tenantRoutes } from '../lib/routes'

export default function AdminShell({slug,title,children}:{slug:string,title:string,children:ReactNode}){
 const r=tenantRoutes(slug)
 const pathname=usePathname()
 const nav=[
  ['สิ่งที่ต้องทำ',r.adminTodo,'✓'],
  ['ทำบิล',r.adminBillingTab,'฿'],
  ['สัญญา',r.adminContractsTab,'✍️'],
  ['ผู้เช่า',r.adminResidentsTab,'👥'],
  ['ทั่วไป',r.adminGeneralTab,'⚙️']
 ]
 const active=(href:string)=>href===r.adminTodo?pathname===r.adminTodo:pathname===href||pathname.startsWith(`${href}/`)
 return <main className="wrap adminAppShell">
   <header className="adminHeader">
    <div><span className="eyebrow">STAYHUB · OWNER</span><h1>{title}</h1><p className="muted">จัดการหอพักของคุณ</p></div>
    <div className="adminHeaderBadge"><span>●</span> ระบบพร้อมใช้งาน</div>
   </header>
   <nav className="adminTabs" aria-label="เมนูเจ้าบ้าน">
    {nav.map(([t,h,icon])=><a key={h} href={h} className={active(h)?'active':''}><span>{icon}</span><strong>{t}</strong></a>)}
   </nav>
   <section className="adminTabBody">{children}</section>
 </main>
}
