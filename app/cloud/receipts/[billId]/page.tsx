'use client'
import dashboardStyles from '../../dashboard.module.css'
import {useEffect,useState} from 'react'
import {useParams} from 'next/navigation'
type Line={label:string;quantity:string;unitRate:string;amount:string}
type Detail={bill:{id:string;property_id:string;unit_name:string;period:string;created_at:string;total:string;status:string};items:Line[];paid:string;outstanding:string;payments?:{id:string;amount:string;method:string;confirmed_at:string}[]}
const money=(s:string)=>Number(s).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})
export default function ReceiptView(){
 const params=useParams<{billId:string}>()
 const [bill,setBill]=useState<Detail|null>(null)
 const [error,setError]=useState('')
 useEffect(()=>{let active=true
  const propertyId=new URLSearchParams(window.location.search).get('propertyId')||''
  if(!propertyId){setError('ไม่พบรหัสที่พัก');return}
  const path='/api/v2/bills/'+encodeURIComponent(params.billId)+'?propertyId='+encodeURIComponent(propertyId)
  void fetch(path,{credentials:'same-origin',cache:'no-store'}).then(async r=>{
   const data=await r.json()
   if(!r.ok)throw Error(data.error||'ไม่สามารถตรวจสอบบิลได้')
   if(active)setBill(data)
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:'โหลดบิลไม่ได้')})
  return()=>{active=false}
 },[params.billId])
 const paid=bill?.bill.status==='paid'&&Number(bill?.outstanding||NaN)===0
 return <main className={dashboardStyles.detail}><div className={dashboardStyles.detailInner}>
  <style>{'@media print{body{background:white!important}.noPrint{display:none!important}.receiptPaper{border:0!important;box-shadow:none!important}.wrap{max-width:none!important;margin:0!important;padding:0!important}}'}</style>
  <header className={dashboardStyles.detailHeader}><a className={dashboardStyles.detailBrand} href="/cloud?tab=finance">StayHub <span>Cloud</span></a><a className={dashboardStyles.back} href="/cloud/receipts">ใบเสร็จทั้งหมด</a></header>
  {error&&<p role="alert" className="card">{error}</p>}
  {!bill&&!error&&<p role="status">กำลังตรวจสอบยอดรับชำระ...</p>}
  {bill&&!paid&&<section className="card"><h1>ยังไม่สามารถออกใบเสร็จได้</h1><p>สถานะบิลยังไม่ชำระครบ</p></section>}
  {bill&&paid&&<section className="card receiptPaper" style={{padding:36}}>
   <h1 style={{textAlign:'center'}}>ใบรับชำระเงิน</h1>
   <p style={{textAlign:'center'}}>StayHub · เอกสารยืนยันรายการชำระ ไม่ใช่ใบกำกับภาษี</p>
   <div className="infoRow"><span>เลขอ้างอิงบิล</span><strong>{bill.bill.id}</strong></div>
   <div className="infoRow"><span>เลขห้อง</span><strong>{bill.bill.unit_name}</strong></div>
   <div className="infoRow"><span>รอบบิล</span><strong>{String(bill.bill.period).slice(0,7)}</strong></div>
   <div className="infoRow"><span>วันที่ออกบิล</span><strong>{new Date(bill.bill.created_at).toLocaleDateString('th-TH')}</strong></div>
   <hr/>
   {bill.items.map((x,i)=><div className="infoRow" key={i}><span>{x.label} · {x.quantity} × {money(x.unitRate)}</span><strong>{money(x.amount)} บาท</strong></div>)}
   <hr/>
   <div className="infoRow"><strong>ยอดรวม</strong><strong>{money(bill.bill.total)} บาท</strong></div>
   <div className="infoRow"><strong>ยอดรับชำระ</strong><strong>{money(bill.paid)} บาท</strong></div>
   <div className="infoRow"><strong>ค้างชำระ</strong><strong>{money(bill.outstanding)} บาท</strong></div>
   <p className="muted">สถานะ: ชำระครบ · ยืนยันจากรายการบันทึกรับเงินของระบบ</p>
   {bill.payments?.length?<>
    <h3>รายการรับชำระ</h3>
    {bill.payments.map(p=><p key={p.id}>{new Date(p.confirmed_at).toLocaleString('th-TH')} · {p.method==='cash'?'เงินสด':'โอน'} · {money(p.amount)} บาท</p>)}
   </>:null}
   <div className="noPrint"><button type="button" className="btn" onClick={()=>window.print()}>พิมพ์ / บันทึกเป็น PDF</button></div>
  </section>}
 </div></main>
}
