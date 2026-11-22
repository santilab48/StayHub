'use client'

import {useEffect,useState} from 'react'
import {getActiveWorkspace,type DeviceWorkspace} from '../../lib/local-workspace'
import { accommodationLabel } from '../../lib/accommodation-types'

export default function WorkspacePage(){
  const [workspace,setWorkspace]=useState<DeviceWorkspace|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{
    getActiveWorkspace().then(setWorkspace).catch(e=>setError(e instanceof Error?e.message:'เปิดข้อมูลไม่ได้')).finally(()=>setLoading(false))
  },[])
  return <main className="wrap" style={{maxWidth:900}}>
    <div className="toolbar"><a href="/" className="muted">StayHub</a><span className="pill">Local-First</span></div>
    {loading?<section className="card">กำลังเปิดพื้นที่ใช้งาน...</section>:error?<section className="card" role="alert">{error}</section>:!workspace?
      <section className="card"><h1>ยังไม่มีพื้นที่ใช้งาน</h1><p className="muted">เริ่มสร้างพื้นที่หอพักบนอุปกรณ์นี้ก่อน</p><a className="btn" href="/start">เริ่มต้นใช้งาน</a></section>:
      <>
        <section className="card"><span className="eyebrow">พื้นที่ใช้งานในอุปกรณ์นี้</span><h1>{workspace.dormName}</h1><p className="muted">ประเภท: {accommodationLabel(workspace.accommodationType)}</p><p className="lead">ผู้ดูแล: {workspace.ownerName}</p><span className="pill">พร้อมใช้งานในเครื่อง</span></section>
        <section className="section card"><h2>ขั้นตอนถัดไป</h2><p>สร้างข้อมูลหอพักเบื้องต้นสำเร็จแล้ว ส่วนการจัดการห้องพัก บิล และการเชิญผู้เช่ายังต้องเชื่อมระบบบัญชีและฐานข้อมูลร่วมกันก่อนใช้งานจริง</p><p className="muted">ข้อมูลเครื่องนี้ยังไม่ใช่บัญชี Cloud และจะไม่ปรากฏใน Dashboard หอพักออนไลน์เดิมโดยอัตโนมัติ</p></section>
      </>}
  </main>
}
