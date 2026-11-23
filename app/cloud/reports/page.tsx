'use client'
import {useCallback,useEffect,useState} from 'react'
type Property={id:string;name:string;role:string}
type Summary={billCount:number;billedTotal:string;paidTotal:string;outstandingTotal:string;unpaidCount:number}
type Bill={id:string;unit_name:string;period:string;total:string;paid:string;outstanding:string;status:string}
type Occupancy={id:string;name:string;capacity:number;occupants:number;active:boolean;blocked:boolean;cleaning:boolean}
async function get<T>(path:string):Promise<T>{
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store'})
 const data=await response.json()
 if(!response.ok)throw Error(data.error||'Report unavailable')
 return data as T
}
const csvCell=(value:string|number)=>'"'+String(value).replace(/^[=+\-@]/,'\t$&').replace(/"/g,'""')+'"'
export default function ReportsPage(){
 const [properties,setProperties]=useState<Property[]>([])
 const [propertyId,setPropertyId]=useState('')
 const [summary,setSummary]=useState<Summary|null>(null)
 const [rooms,setRooms]=useState<Occupancy[]>([])
 const [bills,setBills]=useState<Bill[]>([])
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const load=useCallback(async(id:string)=>{
  if(!id){setSummary(null);setRooms([]);setBills([]);return}
  setLoading(true);setError('')
  try{
   const [a,b,c]=await Promise.all([
    get<Summary>('/api/v2/bills/summary?propertyId='+encodeURIComponent(id)),
    get<{items:Occupancy[]}>('/api/v2/occupancy?propertyId='+encodeURIComponent(id)),
    get<{items:Bill[]}>('/api/v2/bills?propertyId='+encodeURIComponent(id)+'&limit=100&page=1')
   ])
   setSummary(a);setRooms(b.items);setBills(c.items)
  }catch(e){setError(e instanceof Error?e.message:'โหลดรายงานไม่สำเร็จ')}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{let active=true
  void get<{items:Property[]}>('/api/v2/properties').then(v=>{if(active){const owners=v.items.filter(p=>['owner','admin'].includes(p.role));setProperties(owners);setPropertyId(owners[0]?.id||'')}})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'เข้าสู่ระบบ Cloud ก่อน')})
  return()=>{active=false}
 },[])
 useEffect(()=>{void load(propertyId)},[propertyId,load])
 function exportCsv(){
  if(!propertyId||!summary)return
  const p=properties.find(x=>x.id===propertyId)
  const data=[
   ['รายการ','ห้อง','รอบ','ยอดรวม','รับชำระ','ยอดค้าง','สถานะ'],
   ...bills.map(x=>['บิล',x.unit_name,String(x.period).slice(0,10),x.total,x.paid,x.outstanding,x.status]),
   ...rooms.map(x=>['ห้อง',x.name,'',String(x.capacity),String(x.occupants),'',x.active?'active':'inactive'])
  ]
  const content='\uFEFF'+data.map(row=>row.map(csvCell).join(',')).join('\r\n')
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}))
  const a=document.createElement('a');a.href=url;a.download='stayhub-'+(p?.name||'report').replace(/[^a-zA-Z0-9_-]/g,'_')+'.csv';a.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 const occupied=rooms.filter(r=>r.occupants>0).length
 return <main className="wrap" style={{maxWidth:1000}}>
  <p><a href="/cloud">← จัดการที่พัก</a></p><h1>รายงาน · StayHub Cloud</h1>
  <section className="card section"><label>ที่พัก<select value={propertyId} onChange={e=>setPropertyId(e.target.value)}>
   <option value="">-- เลือกที่พัก --</option>
   {properties.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
  </select></label></section>
  {loading&&<p role="status">กำลังโหลด...</p>}
  {error&&<p role="alert" style={{color:'crimson'}}>{error}</p>}
  {summary&&<><div className="metricGrid section">
   <div className="metric"><span className="muted">บิลทั้งหมด</span><strong>{summary.billCount}</strong></div>
   <div className="metric"><span className="muted">เรียกเก็บ</span><strong>{Number(summary.billedTotal).toLocaleString('th-TH')}</strong></div>
   <div className="metric"><span className="muted">รับแล้ว</span><strong>{Number(summary.paidTotal).toLocaleString('th-TH')}</strong></div>
   <div className="metric"><span className="muted">ค้างชำระ</span><strong>{Number(summary.outstandingTotal).toLocaleString('th-TH')}</strong></div>
  </div>
  <section className="card section"><h2>ห้องพัก</h2><p>ห้องทั้งหมด {rooms.length} · มีผู้พัก {occupied} · ห้องว่าง {rooms.filter(r=>r.active&&!r.occupants&&!r.blocked).length}</p></section>
  <section className="card section"><h2>บิลย้อนหลัง (ล่าสุด {bills.length} รายการ)</h2>
   {!bills.length?<p>ยังไม่มีบิล</p>:<div className="list">{bills.map(b=><div className="row" key={b.id}><strong>{b.unit_name} · {String(b.period).slice(0,7)}</strong>
    <span>{Number(b.total).toLocaleString('th-TH')} บาท · {b.status}</span></div>)}</div>}
   <button type="button" className="btn section" disabled={loading} onClick={exportCsv}>ส่งออก CSV</button>
   <p className="footnote">ส่งออกบิลล่าสุดไม่เกิน 100 รายการ และสถานะห้อง ณ เวลาที่โหลด ไม่ใช่รายการทั้งหมดหากมีมากกว่า 100 บิล</p>
  </section></>}
 </main>
}
