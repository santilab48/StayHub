'use client'
import {useState} from 'react'
import styles from '../../cloud/dashboard.module.css'
import tenant from '../../my/tenant.module.css'
import TenantTabs,{tenantSections} from '../../my/TenantTabs'

const samples:Record<string,{title:string;summary:string;detail:string}>={
 billing:{title:'บิลประจำเดือน',summary:'รอบเดือนพฤศจิกายน 2569',detail:'ยอดตัวอย่าง 8,500 บาท · ยังไม่ชำระ'},
 repairs:{title:'รายการแจ้งซ่อม',summary:'ก๊อกน้ำในห้องน้ำ',detail:'ส่งเรื่องแล้ว · รอเจ้าของนัดหมาย'},
 parcels:{title:'พัสดุของห้อง',summary:'พัสดุตัวอย่าง 1 รายการ',detail:'รอรับที่เคาน์เตอร์'},
 announcements:{title:'ประกาศจากที่พัก',summary:'แจ้งตรวจระบบน้ำประจำเดือน',detail:'ประกาศตัวอย่างสำหรับตรวจหน้าจอ'},
 vehicles:{title:'รถของห้อง',summary:'รถจักรยานยนต์',detail:'ทะเบียนตัวอย่าง กข 1234'},
 documents:{title:'เอกสารของห้อง',summary:'สัญญาเช่าตัวอย่าง',detail:'เปิดอ่านได้หลังเข้าสู่ระบบจริง'},
}
export default function TenantPreview(){
 const [active,setActive]=useState('billing')
 const item=samples[active]
 return <main className={styles.shell+' '+tenant.tenantRoot}><div className={styles.workspace}>
  <header className={styles.header}><div><div className={styles.brand}>StayHub <span>ผู้เช่า</span></div><p className={styles.subtitle}>ตัวอย่างหน้าผู้เช่า · ไม่มีข้อมูลจริง</p></div><span className={tenant.previewBadge}>PREVIEW</span></header>
  <div className={styles.content}><section className="card section"><p className="muted">ที่พักตัวอย่าง</p><h1 className={tenant.room}>ห้อง A101</h1><span className="muted">ตัวอย่างสำหรับตรวจ UI เท่านั้น</span></section></div>
  <TenantTabs propertyId="preview" unitId="preview" current={active} onPreviewSelect={setActive}/>
  <div className={tenant.previewGrid}><section className={tenant.previewPanel}><span className={tenant.previewEyebrow}>{tenantSections.find(([key])=>key===active)?.[1]}</span><h2>{item.title}</h2><p>{item.summary}</p><p className="muted">{item.detail}</p><span className={tenant.previewAction}>ปุ่มตัวอย่าง</span></section><section className={tenant.previewPanel}><h2>ข้อมูลล่าสุด</h2><p className="muted">หน้าตัวอย่างนี้ไม่เชื่อมต่อบัญชี บิล หรือข้อมูลผู้เช่าจริง</p><div className={tenant.previewRow}>{item.summary}<span>ตัวอย่าง</span></div></section></div>
 </div></main>
}
