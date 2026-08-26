import { tenantRoutes } from '../lib/routes'

export default function FinanceTabs({slug}:{slug:string}){
  const r=tenantRoutes(slug)
  const items=[
    ['ทำบิล',r.adminFinanceInvoices],
    ['ตรวจสลิป',r.adminFinancePayments],
    ['ใบเสร็จ',r.adminFinanceReceipts],
    ['ออกแบบบิล',r.adminFinanceBillDesigner],
    ['ตั้งราคา',r.adminFinanceSettings]
  ]
  return <nav className="roomSubnav" aria-label="เมนูการเงิน">{items.map(([t,h])=><a href={h} key={h}>{t}</a>)}</nav>
}
