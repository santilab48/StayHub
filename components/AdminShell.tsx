'use client'
import { ReactNode } from 'react'
import { tenantRoutes } from '../lib/routes'
export default function AdminShell({slug,title,children}:{slug:string,title:string,children:ReactNode}){
 const r=tenantRoutes(slug); const nav=[['ภาพรวม',r.admin],['ห้อง',r.adminRooms],['ผู้เช่า',r.adminTenants],['สัญญา',r.adminContracts],['การเงิน',r.adminFinance],['มิเตอร์',r.adminMeters],['แจ้งซ่อม',r.adminRepairs],['พัสดุ',r.adminParcels],['รถ',r.adminRides],['ประกาศ',r.adminNews],['รายงาน',r.adminReports],['ตั้งค่า',r.adminSettings]]
 return <main className="wrap"><div className="toolbar"><div><a href={r.admin}>StayHub Admin / {slug}</a><h1>{title}</h1></div><span className="pill">Admin scoped</span></div><div className="subnav">{nav.map(([t,h])=><a key={h} href={h}>{t}</a>)}</div>{children}</main>
}
