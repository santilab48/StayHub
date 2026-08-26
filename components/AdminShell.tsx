'use client'
import { ReactNode } from 'react'
import { tenantRoutes } from '../lib/routes'

export default function AdminShell({slug,title,children}:{slug:string,title:string,children:ReactNode}){
 const r=tenantRoutes(slug)
 const nav=[['สิ่งที่ต้องทำ',r.adminTodo],['ทำบิล',r.adminBillingTab],['สัญญา',r.adminContractsTab],['ผู้เช่า',r.adminResidentsTab],['ทั่วไป',r.adminGeneralTab]]
 return <main className="wrap">
   <div className="toolbar"><div><a href={r.admin}>StayHub Admin / {slug}</a><h1>{title}</h1></div><span className="pill">Admin scoped</span></div>
   <div className="subnav">{nav.map(([t,h])=><a key={h} href={h}>{t}</a>)}</div>
   {children}
 </main>
}
