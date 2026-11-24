'use client'
import {cents,meterCharge} from '../../../lib/db/billing-calculation'
import dashboardStyles from '../dashboard.module.css'
import {FormEvent,useCallback,useEffect,useRef,useState} from 'react'

type Property={id:string;name:string;role:string}
type Lease={id:string;unit_id:string;unit_name:string;monthly_rent:string;status:string;source?:string;water?:string;electric?:string;service?:string;water_meter?:string;electric_meter?:string}
type Bill={id:string;property_id:string;unit_name:string;period:string;total:string;paid:string;outstanding:string;status:string}
type BillDetail={bill:Bill;items:{feeCode:string;label:string;quantity:string;unitRate:string;amount:string}[];paid:string;outstanding:string;hasInvoice?:boolean;payments?:{id:string;amount:string;method:string;confirmed_at:string}[]}
type MeterType='water'|'electric'
type Reading={meter_type:MeterType;previous_reading:string;current_reading:string;unit_rate:string;usage:string;amount:string}
type MeterState={items:Reading[];previous:{meter_type:MeterType;current_reading:string}[]}
type Summary={billCount:number;billedTotal:string;paidTotal:string;outstandingTotal:string;unpaidCount:number}

async function request<T>(path:string,body?:Record<string,unknown>,key?:string):Promise<T>{
  const response=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})}:{},body:body?JSON.stringify(body):undefined})
  const result=await response.json()
  if(!response.ok)throw Error(({'Invalid meter input':'ข้อมูลมิเตอร์หรือเดือนออกบิลไม่ถูกต้อง','Invalid bill request or Idempotency-Key':'ข้อมูลออกบิลไม่ถูกต้อง',duplicate_month:'ห้องนี้มีบิลเดือนนี้แล้ว',duplicate_reading:'บันทึกมิเตอร์ประเภทนี้ในเดือนนี้แล้ว',initial_reading_required:'กรุณากรอกเลขมิเตอร์ตั้งต้นเดือนแรก',initial_reading_only_for_first_month:'มีเลขเดือนก่อนแล้ว ไม่ต้องกรอกเลขตั้งต้น',reading_decreased_or_overflow:'เลขมิเตอร์ปัจจุบันต้องไม่น้อยกว่าเลขเดิม',meter_readings_required:'กรุณาบันทึกมิเตอร์น้ำและไฟที่มีอัตราเรียกเก็บก่อนออกบิล',overlapping_contracts:'มีสัญญาห้องซ้อนกันในเดือนนี้ กรุณาตรวจสอบสัญญา',lease_outside_period:'สัญญาไม่ครอบคลุมเดือนที่เลือก',payment_exceeds_bill:'ยอดรับเงินเกินยอดค้าง'} as Record<string,string>)[result.error]||result.error||'ไม่สามารถทำรายการได้')
  return result as T
}
const money=(value:string|number|undefined)=>Number(value||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})
const statusText=(v:string)=>({unpaid:'ยังไม่ชำระ',partial:'ชำระบางส่วน',paid:'ชำระครบ',void:'ยกเลิก'} as Record<string,string>)[v]||v
const currentPeriod=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,7)

export default function CloudBillingPage(){
  const [properties,setProperties]=useState<Property[]>([])
  const [propertyId,setPropertyId]=useState('')
  const [leases,setLeases]=useState<Lease[]>([])
  const [leaseId,setLeaseId]=useState('')
  const [period,setPeriod]=useState(currentPeriod)
  const [otherAmount,setOtherAmount]=useState('0.00')
  const [otherLabel,setOtherLabel]=useState('ค่าอื่น ๆ')
  const [meterState,setMeterState]=useState<MeterState|null>(null)
  const [meterError,setMeterError]=useState('')
  const [meterDraft,setMeterDraft]=useState({water:{start:'',end:'',rate:''},electric:{start:'',end:'',rate:''}})
  const [review,setReview]=useState(false)
  const [bills,setBills]=useState<Bill[]>([])
  const [summary,setSummary]=useState<Summary|null>(null)
  const [selectedBill,setSelectedBill]=useState<BillDetail|null>(null)
  const [payAmount,setPayAmount]=useState('')
  const [method,setMethod]=useState<'cash'|'transfer'>('cash')
  const [page,setPage]=useState(1)
  const [hasMore,setHasMore]=useState(false)
  const [busy,setBusy]=useState(false)
  const [action,setAction]=useState('')
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const billListRequest=useRef(0)
  const billReplay=useRef<{payload:string;key:string}|null>(null)
  const paymentReplay=useRef<{payload:string;key:string}|null>(null)
  function stableKey(ref:{current:{payload:string;key:string}|null},payload:Record<string,unknown>){
    const signature=JSON.stringify(payload)
    if(ref.current?.payload!==signature)ref.current={payload:signature,key:crypto.randomUUID()}
    return ref.current.key
  }
  const owner=properties.some(p=>p.id===propertyId&&['owner','admin'].includes(p.role))
  const activeLease=leases.find(l=>l.id===leaseId)
  const month=period+'-01'

  const loadBills=useCallback(async(p:string,pageNumber:number)=>{
    const requestId=++billListRequest.current
    const params=new URLSearchParams({limit:'20',page:String(pageNumber)})
    if(p)params.set('propertyId',p)
    const result=await request<{items:Bill[];hasMore:boolean}>('/api/v2/bills?'+params)
    if(requestId!==billListRequest.current)return
    setBills(result.items);setHasMore(result.hasMore)
    if(p){
      try{
        const next=await request<Summary>('/api/v2/bills/summary?propertyId='+encodeURIComponent(p))
        if(requestId===billListRequest.current)setSummary(next)
      }catch{if(requestId===billListRequest.current)setSummary(null)}
    }else if(requestId===billListRequest.current)setSummary(null)
  },[])
  const loadDetail=useCallback(async(bill:Bill)=>{
    setSelectedBill(await request<BillDetail>('/api/v2/bills/'+encodeURIComponent(bill.id)+'?propertyId='+encodeURIComponent(bill.property_id)))
  },[])
  useEffect(()=>{
    let alive=true
    async function init(){
      try{
        const result=await request<{items:Property[]}>('/api/v2/properties')
        if(!alive)return
        const owned=result.items.filter(p=>['owner','admin'].includes(p.role))
        setProperties(owned)
        // An account without an owner property can still see its own historical bills.
        setPropertyId(owned[0]?.id||'')
      }catch(e){if(alive)setError(e instanceof Error?e.message:'กรุณาเข้าสู่ระบบ Cloud ก่อน')}
    }
    void init()
    return()=>{alive=false}
  },[])
  useEffect(()=>{
    let alive=true
    // Invalidate old property/page responses before starting the new request.
    ++billListRequest.current
    setBills([]);setHasMore(false);setSummary(null)
    async function load(){
      setSelectedBill(null);setLeaseId('');setLeases([])
      try{
        const params=propertyId?'?propertyId='+encodeURIComponent(propertyId):''
        const list=propertyId?await request<{items:Lease[]}>('/api/v2/leases'+params+'&billing=1&period='+encodeURIComponent(month)):{items:[]}
        if(alive){setLeases(list.items.filter(l=>l.status==='active'));setLeaseId(list.items.find(l=>l.status==='active')?.id||'')}
        if(alive)await loadBills(propertyId,page)
      }catch(e){if(alive)setError(e instanceof Error?e.message:'โหลดข้อมูลบิลไม่สำเร็จ')}
    }
    void load()
    return()=>{alive=false}
  },[propertyId,page,loadBills,month])
  const meterPath=activeLease&&propertyId?'/api/v2/meter-readings?'+new URLSearchParams({propertyId,unitId:activeLease.unit_id,period}):''
  const fetchMeters=useCallback(async()=>request<MeterState>(meterPath),[meterPath])
  useEffect(()=>{
    let alive=true;setMeterState(null);setMeterError('');setReview(false)
    setMeterDraft({water:{start:'',end:'',rate:activeLease?.water||''},electric:{start:'',end:'',rate:activeLease?.electric||''}})
    if(meterPath)void fetchMeters().then(data=>{
      if(!alive)return
      setMeterState(data)
      setMeterDraft({water:{start:data.previous.find(x=>x.meter_type==='water')?.current_reading||activeLease?.water_meter||'',end:'',rate:activeLease?.water||''},electric:{start:data.previous.find(x=>x.meter_type==='electric')?.current_reading||activeLease?.electric_meter||'',end:'',rate:activeLease?.electric||''}})
    }).catch(e=>{if(alive)setMeterError(e instanceof Error?e.message:'โหลดมิเตอร์ไม่สำเร็จ')})
    return()=>{alive=false}
  },[meterPath,fetchMeters,activeLease])
  const existing=(type:MeterType)=>meterState?.items.find(m=>m.meter_type===type)
  const prior=(type:MeterType)=>meterState?.previous.find(m=>m.meter_type===type)
  const requiredMeter=(type:MeterType)=>activeLease?.source==='room_contract'&&Number(activeLease[type])>0
  const hasInput=(type:MeterType)=>meterDraft[type].end.trim()!==''
  const normalize=(s:string)=>s.trim().replace(/^0+(?=[0-9])/,'')
  const meterAmount=(type:MeterType)=>{
    const saved=existing(type);if(saved)return Number(saved.amount)
    const d=meterDraft[type]
    if(!hasInput(type))return 0
    const charge=meterCharge(normalize(d.start),normalize(d.end),normalize(d.rate))
    return charge?charge.amount/100:NaN
  }
  const missing=(['water','electric'] as const).filter(t=>!existing(t)&&(requiredMeter(t)||hasInput(t)))
  const validOther=cents(normalize(otherAmount))!==null
  const total=Number(activeLease?.monthly_rent||0)+Number(activeLease?.service||0)+meterAmount('water')+meterAmount('electric')+Number(otherAmount)
  const canReview=!!activeLease&&!!meterState&&!meterError&&!missing.length&&validOther&&Number.isFinite(total)&&total>=0&&(Number(otherAmount)===0||!!otherLabel.trim())
  async function run(task:()=>Promise<void>,area='detail'){
    setAction(area)
    setBusy(true);setError('');setNotice('')
    try{await task()}catch(e){setError(e instanceof Error?e.message:'ทำรายการไม่สำเร็จ')}
    finally{setBusy(false)}
  }
  async function saveMeter(type:MeterType){
    if(!activeLease||!meterState||busy||existing(type)||!hasInput(type)||!Number.isFinite(meterAmount(type)))return
    const d=meterDraft[type]
    setReview(false)
    await run(async()=>{
      const body:Record<string,unknown>={propertyId,unitId:activeLease.unit_id,meterType:type,period,currentReading:normalize(d.end),unitRate:normalize(d.rate)}
      if(!prior(type))body.initialReading=normalize(d.start)
      try{await request('/api/v2/meter-readings',body)}catch(e){setMeterState(await fetchMeters());throw e}
      setMeterState(await fetchMeters())
      setNotice('บันทึกมิเตอร์'+(type==='water'?'น้ำ':'ไฟ')+'เรียบร้อย')
    },type)
  }
  async function issueBill(e:FormEvent){
    e.preventDefault();if(!activeLease||!canReview||busy)return
    if(!review){setReview(true);setAction('issue');setError('');setNotice('');return}
    await run(async()=>{
      const body={propertyId,...(activeLease.source==='room_contract'?{roomContractId:leaseId}:{leaseId}),period,otherAmount:normalize(otherAmount),otherLabel:otherLabel.trim()||'ค่าอื่น ๆ'}
      const result=await request<{id:string}>('/api/v2/bills',body,stableKey(billReplay,body))
      billReplay.current=null
      setReview(false);setNotice('ออกบิลเรียบร้อย เลขอ้างอิง '+result.id.slice(0,8))
      const detail=await request<BillDetail>('/api/v2/bills/'+encodeURIComponent(result.id)+'?propertyId='+encodeURIComponent(propertyId))
      setSelectedBill(detail);setPayAmount(detail.outstanding)
      await loadBills(propertyId,1)
      requestAnimationFrame(()=>document.getElementById('bill-detail')?.scrollIntoView({behavior:'smooth'}))
    },'issue')
  }
  async function payBill(e:FormEvent){e.preventDefault();if(!selectedBill)return
    await run(async()=>{
      const bill=selectedBill.bill
      const body={propertyId:bill.property_id,amount:payAmount,method}
      await request('/api/v2/bills/'+encodeURIComponent(bill.id)+'/payments',body,stableKey(paymentReplay,{billId:bill.id,...body}))
      paymentReplay.current=null
      await loadBills(propertyId,page)
      await loadDetail(bill)
      setPayAmount('');setNotice('บันทึกรับเงินเรียบร้อย')
    },'payment')
  }
  const feedback=(area:string)=>action===area?<div aria-live="polite">{busy?<p>กำลังดำเนินการ...</p>:error?<p role="alert" style={{color:'#b91c1c',background:'#fff1f2',padding:12,borderRadius:8}}>{error}</p>:notice?<p role="status" style={{color:'#166534',background:'#f0fdf4',padding:12,borderRadius:8}}>{notice}</p>:null}</div>:null
  return <main className={dashboardStyles.detail}><div className={dashboardStyles.detailInner}>
    <header className={dashboardStyles.detailHeader}><a className={dashboardStyles.detailBrand} href="/cloud?tab=finance">StayHub <span>Cloud</span></a><a className={dashboardStyles.back} href="/cloud?tab=finance">กลับหน้าจัดการ</a></header>
    <p><a className="btn secondary" href="/cloud/leases">จัดการสัญญาเช่าก่อนทำบิล</a></p>
    <h1>บิลรายเดือน · StayHub Cloud</h1>
    <p><a className="btn secondary" href="/cloud/receipts">ดูใบเสร็จที่ชำระครบ</a></p>
    <p className="muted">ค่าน้ำ ค่าไฟ ค่าเช่า และการรับเงินสด/โอน · ข้อมูลผูกกับบัญชีและที่พักจากระบบ Cloud</p>
    
    {error&&<p role="alert" className="card" style={{color:'crimson'}}>{error}</p>}
    {notice&&<p role="status" className="card">{notice}</p>}
    
      {owner&&<>
      <section className="card section"><h2>ออกบิลรายเดือน</h2>
        <form className="list" onSubmit={e=>void issueBill(e)}>
          <label>เดือนออกบิล <input type="month" required disabled={busy} value={period} onChange={e=>{setPeriod(e.target.value);setReview(false)}}/></label>
          <label>ห้องพัก <select value={leaseId} disabled={busy} onChange={e=>{setLeaseId(e.target.value);setReview(false)}} required>
            <option value="">-- เลือกห้อง --</option>{leases.map(l=><option key={l.id} value={l.id}>{l.unit_name} · ค่าเช่า {money(l.monthly_rent)} บาท</option>)}
          </select></label>
          {!leases.length&&<p className="muted">ไม่พบสัญญาที่ครอบคลุมเดือนนี้ <a href="/cloud/leases">ตรวจสัญญารายห้อง</a></p>}
          {activeLease&&<><div className="row"><span>ค่าเช่าตามสัญญา</span><strong>{money(activeLease.monthly_rent)} บาท</strong></div><div className="row"><span>ค่าบริการตามสัญญา</span><strong>{money(activeLease.service)} บาท</strong></div>
          {meterError?<p role="alert">{meterError}</p>:!meterState?<p role="status">กำลังโหลดข้อมูลมิเตอร์...</p>:<>{(['water','electric'] as const).map(type=>{
            const saved=existing(type),prev=prior(type),d=meterDraft[type]
            const change=(field:'start'|'end'|'rate',value:string)=>{setMeterDraft(old=>({...old,[type]:{...old[type],[field]:value}}));setReview(false)}
            return <div key={type} className="card section"><h3>{type==='water'?'ค่าน้ำ':'ค่าไฟ'} {saved?'· บันทึกแล้ว':''}</h3>
            {saved?<p>เลขเดิม {saved.previous_reading} · เลขใหม่ {saved.current_reading} · ใช้ {saved.usage} หน่วย × {money(saved.unit_rate)} บาท</p>:<>
            <label>เลขมิเตอร์เดิม <input inputMode="decimal" disabled={busy||!!prev} value={d.start} onChange={e=>change('start',e.target.value)}/></label>
            <label>เลขมิเตอร์ใหม่ <input inputMode="decimal" disabled={busy} value={d.end} onChange={e=>change('end',e.target.value)}/></label>
            <label>อัตราต่อหน่วย (บาท) <input inputMode="decimal" disabled={busy||activeLease.source==='room_contract'} value={d.rate} onChange={e=>change('rate',e.target.value)}/></label>
            {!hasInput(type)&&requiredMeter(type)&&<small>กรุณากรอกเลขมิเตอร์ใหม่เพื่อคำนวณ</small>}
            {hasInput(type)&&!Number.isFinite(meterAmount(type))&&<p role="alert">ตรวจเลขเดิม เลขใหม่ และอัตราต่อหน่วย</p>}
            <button type="button" className="btn secondary" disabled={busy||!hasInput(type)||!Number.isFinite(meterAmount(type))} onClick={()=>void saveMeter(type)}>{busy&&action===type?'กำลังบันทึก...':type==='water'?'บันทึกมิเตอร์น้ำ':'บันทึกมิเตอร์ไฟ'}</button>
            </>}
            {feedback(type)}<div className="row"><span>ยอด{type==='water'?'ค่าน้ำ':'ค่าไฟ'}</span><strong>{Number.isFinite(meterAmount(type))?money(meterAmount(type)):'–'} บาท</strong></div></div>
          })}</>}
          <label>ค่าอื่น ๆ (บาท) <input inputMode="decimal" value={otherAmount} disabled={busy} onChange={e=>{setOtherAmount(e.target.value);setReview(false)}} required/></label>
          <label>รายละเอียดค่าอื่น ๆ <input maxLength={120} value={otherLabel} disabled={busy} onChange={e=>{setOtherLabel(e.target.value);setReview(false)}} required={Number(otherAmount)>0}/></label>
          <div className="card section"><h3>ยอดรวมที่ต้องชำระ</h3><strong style={{fontSize:26}}>{canReview?money(total):'–'} บาท</strong>{review&&<p>ตรวจสอบยอดรวมแล้วกดยืนยันออกบิล</p>}</div>
          {missing.length>0&&<p className="muted">บันทึกมิเตอร์{missing.map(t=>t==='water'?'น้ำ':'ไฟ').join('และ')}ก่อนออกบิล</p>}
          <button className="btn" type="submit" disabled={busy||!canReview}>{busy&&action==='issue'?'กำลังออกบิล...':review?'ยืนยันออกบิล':'ตรวจสอบยอดก่อนออกบิล'}</button>{feedback('issue')}
          {review&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>setReview(false)}>กลับไปแก้ไข</button>}</>}
        </form>
      </section>
      {summary&&<section className="card section"><h2>สรุปบิล</h2><p>บิล {summary.billCount} ใบ · เรียกเก็บ {money(summary.billedTotal)} บาท · รับแล้ว {money(summary.paidTotal)} บาท · ค้าง {money(summary.outstandingTotal)} บาท</p></section>}
    </>}
    <section className="card section"><h2>{owner?'ประวัติบิลที่พัก':'บิลของฉัน'}</h2>
      {bills.length===0?<p className="muted">ยังไม่มีรายการบิล</p>:<div className="list">{bills.map(b=><div className="row" key={b.id}>
        <div><strong>{b.unit_name} · {String(b.period).slice(0,7)}</strong><p className="muted">{statusText(b.status)} · ยอด {money(b.total)} บาท · ค้าง {money(b.outstanding)} บาท</p></div>
        <button type="button" className="btn secondary" disabled={busy} onClick={()=>void run(()=>loadDetail(b))}>ดูบิล</button>
      </div>)}</div>}
      <div className="flow"><button className="btn secondary" type="button" disabled={busy||page===1} onClick={()=>setPage(v=>v-1)}>ก่อนหน้า</button><span>หน้า {page}</span><button className="btn secondary" type="button" disabled={busy||!hasMore} onClick={()=>setPage(v=>v+1)}>ถัดไป</button></div>
    </section>
    {selectedBill&&<section id="bill-detail" className="card section">
      {selectedBill.bill.status==='paid'&&Number(selectedBill.outstanding)===0&&<p><a className="btn secondary" href={'/cloud/receipts/'+encodeURIComponent(selectedBill.bill.id)+'?propertyId='+encodeURIComponent(selectedBill.bill.property_id)}>ใบเสร็จ / พิมพ์ PDF</a></p>}<div className="toolbar"><h2>รายละเอียดบิล {String(selectedBill.bill.period).slice(0,7)}</h2><button type="button" className="btn secondary" onClick={()=>setSelectedBill(null)}>ปิด</button></div>
      <p>ห้อง {selectedBill.bill.unit_name} · {statusText(selectedBill.bill.status)}</p><a className="btn secondary" href={'/api/v2/bills/'+encodeURIComponent(selectedBill.bill.id)+'/pdf?propertyId='+encodeURIComponent(selectedBill.bill.property_id)} target="_blank" rel="noopener noreferrer">ใบแจ้งหนี้ PDF</a>
      <div className="list">{selectedBill.items.map((i,n)=><div key={i.feeCode+n} className="row"><span>{i.label}</span><strong>{money(i.amount)} บาท</strong></div>)}</div>
      <hr/><p><strong>ยอดรวม {money(selectedBill.bill.total)} บาท</strong></p><p>รับแล้ว {money(selectedBill.paid)} บาท · ค้าง {money(selectedBill.outstanding)} บาท</p>
      {owner&&<>
        {selectedBill.payments&&selectedBill.payments.length>0&&<div className="list"><h3>ประวัติรับเงิน</h3>{selectedBill.payments.map(p=><p key={p.id}>{money(p.amount)} บาท · {p.method==='cash'?'เงินสด':'โอน'} · {new Date(p.confirmed_at).toLocaleString('th-TH')}</p>)}</div>}
        {selectedBill.bill.status!=='paid'&&selectedBill.bill.status!=='void'&&<form className="list" onSubmit={e=>void payBill(e)}><h3>บันทึกรับเงิน</h3>
          <label>จำนวนเงิน (บาท) <input required inputMode="decimal" value={payAmount} onChange={e=>setPayAmount(e.target.value)}/></label>
          <label>วิธีรับเงิน <select value={method} onChange={e=>setMethod(e.target.value as 'cash'|'transfer')}><option value="cash">เงินสด</option><option value="transfer">โอนเงิน</option></select></label>
          <button className="btn" disabled={busy} type="submit">{busy&&action==='payment'?'กำลังบันทึก...':'ยืนยันรับเงิน'}</button>{feedback('payment')}
        </form>}
      </>}
    </section>}
  </div></main>
}
