'use client'

import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import {createDeviceWorkspace,getActiveWorkspace} from '../../lib/local-workspace'

export default function StartPage(){
  const router=useRouter()
  const [ownerName,setOwnerName]=useState('')
  const [dormName,setDormName]=useState('')
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const [existing,setExisting]=useState(false)
  useEffect(()=>{getActiveWorkspace().then(value=>setExisting(Boolean(value))).catch(()=>{})},[])
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setSaving(true);setError('')
    try{
      await createDeviceWorkspace(ownerName,dormName)
      router.push('/workspace')
    }catch(e){setError(e instanceof Error?e.message:'บันทึกข้อมูลไม่ได้')}finally{setSaving(false)}
  }
  return <main className="wrap" style={{maxWidth:680}}>
    <a href="/" className="muted">← StayHub</a>
    <section className="card section">
      <span className="badge">เริ่มต้นใช้งาน</span>
      <h1>สร้างพื้นที่หอพักของคุณ</h1>
      <p className="lead">ตั้งค่าพื้นที่ใช้งานบนอุปกรณ์นี้ได้ทันที โดยไม่ต้องใช้ LINE OA</p>
      <form onSubmit={submit} className="list">
        <label>ชื่อผู้ดูแล<input required maxLength={80} autoComplete="name" value={ownerName} onChange={e=>setOwnerName(e.target.value)} placeholder="ชื่อของคุณ"/></label>
        <label>ชื่อหอพัก<input required maxLength={100} value={dormName} onChange={e=>setDormName(e.target.value)} placeholder="เช่น บ้านสวน เรสซิเดนซ์"/></label>
        {error&&<p role="alert" style={{color:'#a22'}}>{error}</p>}
        <button className="btn" disabled={saving} type="submit">{saving?'กำลังบันทึก...':'สร้างพื้นที่และเริ่มใช้งาน'}</button>
      </form>
      {existing&&<p><a href="/workspace">เปิดพื้นที่เดิมในเครื่องนี้</a></p>}
      <p className="footnote">นี่คือการเริ่มต้นแบบเก็บข้อมูลในเครื่อง ไม่ใช่การสร้างบัญชีออนไลน์ ข้อมูลยังไม่ซิงก์ไปอุปกรณ์อื่น และอาจหายเมื่อเคลียร์ข้อมูลเบราว์เซอร์ ห้ามใช้เก็บเอกสารหรือข้อมูลส่วนบุคคลที่สำคัญจนกว่าระบบสำรองข้อมูลจะพร้อม</p>
    </section>
  </main>
}
