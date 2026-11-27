'use client'
import {useEffect,useState} from 'react'
import styles from '../cloud/dashboard.module.css'
import tenant from './tenant.module.css'
import TenantTabs from './TenantTabs'
type Stay={id:string;property_id:string;unit_id:string;property_name:string;unit_name:string}
const tiles=[['billing','บิลของฉัน','ใบแจ้งหนี้และยอดชำระ','M5 3h14v18l-3-2-4 2-4-2-3 2V3M8 8h8m-8 4h8'],['repairs','แจ้งซ่อม','แจ้งปัญหาและติดตาม','M14 6a5 5 0 0 0-6 6L3 17l4 4 5-5a5 5 0 0 0 6-6l-4 4-4-4 4-4Z'],['parcels','พัสดุ','ตรวจสอบพัสดุของห้อง','M3 7l9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10'],['announcements','ประกาศ','ข่าวสารจากที่พัก','M3 10v4h4l9 5V5l-9 5H3Zm4 4 2 6'],['vehicles','รถของห้อง','ลงทะเบียนรถ','M3 16V9l3-5h12l3 5v7M3 11h18M5 16v3m14-3v3'],['documents','เอกสาร','ข้อความและเอกสารของห้อง','M6 3h9l5 5v13H6V3Zm9 0v6h5M9 13h8m-8 4h8']]
export default function MyStayPage(){
 const [stays,setStays]=useState<Stay[]>([])
 const [state,setState]=useState('กำลังตรวจสอบสิทธิ์...')
 useEffect(()=>{let live=true;const load=async()=>{try{const d=await fetch('/api/v2/tenant-device',{cache:'no-store'});const v=await d.json();if(!d.ok||v.status!=='approved'){if(live)setState(v.status==='pending'?'รอเจ้าของอนุมัติ':'กรุณาสแกน QR ประจำห้องอีกครั้ง');return}const r=await fetch('/api/v2/my-stays?tenant=1',{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();if(live){setStays(data.items);setState('')}}catch{if(live)setState('ไม่สามารถโหลดข้อมูลห้องได้')}};void load();return()=>{live=false}},[])
 return <main className={styles.shell+' '+tenant.tenantRoot}><div className={styles.workspace}><header className={styles.header}><div><div className={styles.brand}>StayHub <span>ผู้เช่า</span></div><p className={styles.subtitle}>บริการที่พักของฉัน</p></div></header><div className={styles.content}>
 {state&&<section className="card section" role="status">{state}</section>}
 {!state&&!stays.length&&<section className="card section">ไม่พบห้องที่ได้รับอนุมัติ</section>}
 {stays.map(s=><section key={s.id} className={tenant.stack}><div className="card section"><p className="muted">{s.property_name}</p><h1 className={tenant.room}>ห้อง {s.unit_name}</h1><span className="muted">ได้รับอนุมัติแล้ว</span></div><TenantTabs propertyId={s.property_id} unitId={s.unit_id}/><div className={tenant.tiles}>{tiles.map(([route,title,desc,path])=><a key={route} className={tenant.tile} href={'/my/'+route+'?'+new URLSearchParams({propertyId:s.property_id,unitId:s.unit_id})}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg><strong>{title}</strong><small>{desc}</small></a>)}</div></section>)}
 </div></div></main>
}
