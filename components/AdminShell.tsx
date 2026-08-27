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
   <style jsx global>{`
    .adminAppShell{max-width:1180px}.adminHeader{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-bottom:18px}.adminHeader h1{margin:6px 0 4px}.adminHeaderBadge{background:#fff;border:1px solid #e2e8f0;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:800;color:#435169;box-shadow:0 4px 16px rgba(22,32,51,.04)}.adminHeaderBadge span{color:#22a35a;margin-right:5px}.adminTabs{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:7px;background:#e8edf4;border-radius:18px;position:sticky;top:8px;z-index:20;box-shadow:0 8px 24px rgba(22,32,51,.06)}.adminTabs a{display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:10px;border-radius:13px;text-decoration:none;color:#66758a;font-size:14px}.adminTabs a>span{font-size:17px}.adminTabs a.active{background:#fff;color:#172033;box-shadow:0 4px 15px rgba(22,32,51,.09)}.adminTabs a.active strong{font-weight:900}.adminTabBody{padding-top:20px}@media(max-width:680px){.adminHeader{align-items:flex-start}.adminHeaderBadge{display:none}.adminTabs{gap:4px;padding:5px;overflow:hidden}.adminTabs a{min-height:58px;flex-direction:column;gap:3px;font-size:11px;padding:6px 3px}.adminTabs a>span{font-size:18px}.adminTabBody{padding-top:14px}}
   `}</style>
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
