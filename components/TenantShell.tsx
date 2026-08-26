'use client'
import { ReactNode } from 'react'
import { tenantRoutes } from '../lib/routes'

export default function TenantShell({slug,title,children}:{slug:string,title:string,children:ReactNode}){
  const r=tenantRoutes(slug)
  const nav=[['หน้าหลัก',r.home],['ห้อง',r.room],['บิล',r.billing],['ซ่อม',r.repair],['บริการ',r.services],['ข่าว',r.news]]
  return <main className="wrap"><div className="toolbar"><div><a href={r.home}>StayHub / {slug}</a><h1>{title}</h1></div><span className="pill">Tenant scoped</span></div><div className="subnav">{nav.map(([t,h])=><a key={h} href={h}>{t}</a>)}</div>{children}</main>
}
