import { tenantRoutes } from '../lib/routes'

export default function RoomNav({slug}:{slug:string}){
  const r=tenantRoutes(slug)
  const items=[
    ['ภาพรวม',r.room],
    ['สัญญา',r.contract],
    ['ผู้อยู่อาศัย',r.occupants],
    ['รถ',r.vehicles],
    ['เอกสาร',r.documents]
  ]
  return <nav className="roomSubnav" aria-label="เมนูห้องของฉัน">{items.map(([t,h])=><a href={h} key={h}>{t}</a>)}</nav>
}
