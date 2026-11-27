'use client'
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react'
import styles from './guesthouse.module.css'
import dashboard from './dashboard.module.css'
import GuesthouseCashier from './guesthouse-cashier'
import RoomOverview from './room-overview'
import {accommodationLabel} from '../../lib/accommodation-types'
import SharedAdLayout from '../components/ads/SharedAdLayout'
import {type RoomDetails,defaultRoomDetails,parseRoomDetails,roomAmenities} from '../../lib/room-details'
import {type BookingDetails,bookingSources,parseBookingDetails} from '../../lib/booking-details'
import {userFacingError} from '../../lib/user-facing-error'

type Property={id:string;name:string;property_type:string;role:string}
type Room={id:string;name:string;active:boolean;occupants:number;reserved:boolean;cleaning:boolean;blocked:boolean;room_details?:RoomDetails|null;capacity?:number}
type Booking={actualCheckIn?:string;actualCheckOut?:string;id:string;unit_id:string;unit_name:string;arrival_date:string;departure_date:string;status:string;total_amount:string|null;booking_details?:BookingDetails|null}
type JoinRequest={id:string;unit_id:string|null;email:string;status:string}
type Tab='overview'|'bookings'|'rooms'|'arrivals'|'finance'|'reports'|'settings'
const menus:{id:Tab;label:string;desc:string;icon:string}[]=[
 {id:'bookings',label:'การจอง',desc:'ปฏิทินและสร้างรายการจอง',icon:'M4 6h16v15H4zM4 10h16M8 3v6M16 3v6'},
 {id:'rooms',label:'จัดการห้องพัก',desc:'เพิ่มห้องและดูสถานะ',icon:'M3 20V5m0 11h18v4M3 10h6a3 3 0 0 1 3 3v3m0-6h6a3 3 0 0 1 3 3v3'},
 {id:'arrivals',label:'เช็กอิน / เช็กเอาต์',desc:'จัดการการเข้าพัก',icon:'M4 21h16M7 21V4h10v17M12 12h1'},
 {id:'finance',label:'รับเงิน / ใบเสร็จ',desc:'ยอดค่าจองและเอกสาร',icon:'M5 3h14v18l-3-2-4 2-4-2-3 2V3M8 8h8m-8 4h8'},
 {id:'reports',label:'รายงาน',desc:'ภาพรวมการจองและห้องพัก',icon:'M4 20V4m0 16h16M8 15l4-5 4 3 4-7'},
 {id:'settings',label:'ตั้งค่าที่พัก',desc:'ข้อมูลที่พักและสมาชิก',icon:'M12 3v3m0 12v3M3 12h3m12 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2 M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8'}
]
const labels:Record<string,string>={pending:'รอยืนยัน',confirmed:'จองแล้ว',checked_in:'เข้าพัก',checked_out:'เช็กเอาต์แล้ว',cancelled:'ยกเลิก',no_show:'ไม่มาเข้าพัก'}
const dateOnly=(d:string)=>String(d).slice(0,10)
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const shift=(d:string,n:number)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10)
const monthStart=(d:string)=>d.slice(0,7)+'-01'
const moveMonth=(d:string,n:number)=>{const t=new Date(monthStart(d)+'T00:00:00Z');t.setUTCMonth(t.getUTCMonth()+n);return t.toISOString().slice(0,10)}
const monthLabel=(d:string)=>new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T00:00:00Z'))
const weekday=(d:string)=>['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'][new Date(d+'T00:00:00Z').getUTCDay()]
const BASE_PREVIEW_BOOKINGS_KEY='stayhub_guesthouse_preview_bookings_v2'
const BASE_PREVIEW_ROOMS_KEY='stayhub_guesthouse_preview_rooms_v1'
const demoRooms:Room[]=Array.from({length:6},(_,i)=>({id:'demo-'+i,name:String(101+i),active:true,occupants:i===0?1:0,reserved:i===1,cleaning:i===3,blocked:false,room_details:{...defaultRoomDetails,nightlyRate:700+i*100},capacity:2}))
const money=(n:number)=>new Intl.NumberFormat('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)
function Icon({path}:{path:string}){return <svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>}
async function request<T>(path:string,body?:Record<string,unknown>,key?:string):Promise<T>{
 const r=await fetch('/api/v2/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})}:{},body:body?JSON.stringify(body):undefined})
 const data=await r.json();if(!r.ok)throw Error(userFacingError(data.error));return data as T
}
export default function GuesthouseDashboard({property,onLogout,logoutBusy,logoutError,preview=false}:{property:Property;onLogout:()=>void;logoutBusy:boolean;logoutError:string;preview?:boolean}){
 const typeLabel=accommodationLabel(property.property_type)
 const suffix=property.property_type==='guesthouse'?'':':'+property.property_type
 const PREVIEW_BOOKINGS_KEY=BASE_PREVIEW_BOOKINGS_KEY+suffix
 const PREVIEW_ROOMS_KEY=BASE_PREVIEW_ROOMS_KEY+suffix
 const [tab,setTab]=useState<Tab>('overview'),[rooms,setRooms]=useState<Room[]>([]),[bookings,setBookings]=useState<Booking[]>([]),[requests,setRequests]=useState<JoinRequest[]>([])
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [unitId,setUnitId]=useState(''),[arrival,setArrival]=useState(today),[departure,setDeparture]=useState(()=>shift(today(),1)),[roomName,setRoomName]=useState(''),[month,setMonth]=useState(()=>monthStart(today())),[joinIds,setJoinIds]=useState<Record<string,string>>({})
 const [overviewDetail,setOverviewDetail]=useState('')
 const [repairCount,setRepairCount]=useState<string>('')
 useEffect(()=>{if(preview||tab!=='overview')return;let active=true;setRepairCount('');void request<{items:{status:string}[];owner:boolean}>('repairs?propertyId='+encodeURIComponent(property.id)).then(r=>{if(active&&r.owner){const n=r.items.filter(x=>x.status!=='closed').length;setRepairCount(String(n)+(r.items.length===200?' (จาก 200 รายการล่าสุด)':''))}}).catch(()=>{if(active)setRepairCount('')});return()=>{active=false}},[property.id,preview,tab])
 const [arrivalTab,setArrivalTab]=useState<'waiting'|'staying'|'departing'|'history'>('waiting')
 const [staySearch,setStaySearch]=useState('')
 const [stayDate,setStayDate]=useState('')
 const [roomDetails,setRoomDetails]=useState<RoomDetails>(defaultRoomDetails)
 const [roomNumbers,setRoomNumbers]=useState({area:'',capacity:'',nightlyRate:'',weekendRate:''})
 const [editRoomId,setEditRoomId]=useState('')
 const [roomActive,setRoomActive]=useState(true)
 const updateRoom=<K extends keyof RoomDetails>(key:K,value:RoomDetails[K])=>setRoomDetails(v=>({...v,[key]:value}))
 function resetRoom(){setEditRoomId('');setRoomName('');setRoomDetails(defaultRoomDetails);setRoomNumbers({area:'',capacity:'',nightlyRate:'',weekendRate:''});setRoomActive(true)}
 function editRoom(r:Room){const details=r.room_details||{...defaultRoomDetails,capacity:r.capacity||2};setEditRoomId(r.id);setRoomName(r.name);setRoomDetails(details);setRoomNumbers({area:details.area===null?'':String(details.area),capacity:String(details.capacity),nightlyRate:String(details.nightlyRate),weekendRate:details.weekendRate===null?'':String(details.weekendRate)});setRoomActive(r.active);document.getElementById('guesthouse-room-form')?.scrollIntoView({behavior:'smooth'})}
 const [guest,setGuest]=useState<BookingDetails>({guestName:'',phone:'',email:'',adults:1,children:0,checkInTime:'14:00',checkOutTime:'12:00',nightlyRate:0,source:'direct',notes:''})
 const [guestNumbers,setGuestNumbers]=useState({adults:'',children:'',nightlyRate:''})
 const updateGuest=<K extends keyof BookingDetails>(key:K,value:BookingDetails[K])=>setGuest(v=>({...v,[key]:value}))
 const nights=arrival&&departure?Math.max(0,Math.round((Date.parse(departure)-Date.parse(arrival))/86400000)):0
 const total=Math.round(Number(guestNumbers.nightlyRate)*100)*nights/100
 const pendingKey=useRef<{payload:string;key:string}|null>(null)
 const load=useCallback(async()=>{
  const q='?propertyId='+encodeURIComponent(property.id)
  const [r,b,j,m]=await Promise.all([request<{items:Room[]}>('occupancy'+q),request<{items:Booking[]}>('reservations'+q),request<{items:JoinRequest[]}>('requests'+q),request<{items:{id:string;room_details:RoomDetails|null;capacity:number}[]}>('guesthouse-rooms'+q)])
  setRooms(r.items.map(room=>({...room,...m.items.find(x=>x.id===room.id)})));setBookings(b.items);setRequests(j.items)
 },[property.id])
 useEffect(()=>{if(preview){const t=today();try{const saved=JSON.parse(localStorage.getItem(PREVIEW_ROOMS_KEY)||'null');setRooms(Array.isArray(saved)?saved:demoRooms)}catch{setRooms(demoRooms)};const defaults:Booking[]=[{id:'demo-b1',unit_id:'demo-0',unit_name:'101',arrival_date:shift(t,-1),departure_date:shift(t,3),status:'checked_in',total_amount:'2400'},{id:'demo-b2',unit_id:'demo-1',unit_name:'102',arrival_date:t,departure_date:shift(t,5),status:'confirmed',total_amount:'3500'},{id:'demo-b3',unit_id:'demo-2',unit_name:'103',arrival_date:shift(t,6),departure_date:shift(t,11),status:'confirmed',total_amount:'4500'}];try{const saved=localStorage.getItem(PREVIEW_BOOKINGS_KEY);const parsed=saved?JSON.parse(saved):null;setBookings(Array.isArray(parsed)?parsed:defaults)}catch{setBookings(defaults)}setLoading(false);return}setLoading(true);void load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[load,preview])
 async function act(task:()=>Promise<void>){if(preview||busy)return;setBusy(true);setError('');setNotice('');try{await task();await load()}catch(e){setError(e instanceof Error?e.message:'ดำเนินการไม่สำเร็จ')}finally{setBusy(false)}}
 const now=today(),active=rooms.filter(r=>r.active),occupied=active.filter(r=>r.occupants>0),available=active.filter(r=>!r.occupants&&!r.reserved&&!r.blocked&&!bookings.some(b=>b.unit_id===r.id&&['confirmed','checked_in'].includes(b.status)&&dateOnly(b.arrival_date)<=now&&dateOnly(b.departure_date)>now)),arrivals=bookings.filter(b=>b.status==='confirmed'&&dateOnly(b.arrival_date)===now),departures=bookings.filter(b=>b.status==='checked_in'&&dateOnly(b.departure_date)<=now)
 const months=[month,moveMonth(month,1)].map(start=>({start,days:Array.from({length:(Date.parse(moveMonth(start,1))-Date.parse(start))/86400000},(_,i)=>shift(start,i))}))
 const days=months.flatMap(m=>m.days)
 const calendarRef=useRef<HTMLDivElement>(null)
 const [focusedBooking,setFocusedBooking]=useState<Booking|null>(null)
 useEffect(()=>{if(tab==='bookings'&&calendarRef.current)calendarRef.current.scrollLeft=0;setFocusedBooking(null)},[month,tab])
 function goToday(){setMonth(monthStart(today()));setFocusedBooking(null);requestAnimationFrame(()=>{const el=calendarRef.current;const cell=el?.querySelector<HTMLElement>('[data-today="true"]');if(el&&cell)el.scrollLeft=cell.offsetLeft-84})}
 function calendarCells(r:Room){const cells=[];let i=0;while(i<days.length){const d=days[i];const b=bookings.find(b=>b.unit_id===r.id&&['confirmed','checked_in'].includes(b.status)&&dateOnly(b.arrival_date)<=d&&dateOnly(b.departure_date)>d);if(b){let end=i+1;while(end<days.length&&days[end]<dateOnly(b.departure_date))end++;cells.push(<td key={d} colSpan={end-i} className={styles.bookedCell}><button type="button" className={b.status==='checked_in'?styles.stayBar:styles.bookingBar} onClick={()=>setFocusedBooking(b)} title={labels[b.status]+' · '+dateOnly(b.arrival_date)+' – '+dateOnly(b.departure_date)}>{b.booking_details?.guestName||labels[b.status]} · {b.unit_name}</button></td>);i=end}else{cells.push(<td key={d} className={d===now?styles.todayCell:styles.dayCell}><button type="button" aria-label={'เลือกห้อง '+r.name+' วันที่ '+d} disabled={d<now} onClick={()=>{chooseRoom(r.id);setArrival(d);setDeparture(shift(d,1));setFocusedBooking(null);document.getElementById('guesthouse-booking-form')?.scrollIntoView({behavior:'smooth',block:'start'})}}/></td>);i++}}return cells}

 const bookedValue=bookings.filter(b=>!['cancelled','no_show'].includes(b.status)&&b.total_amount!==null).reduce((n,b)=>n+Number(b.total_amount),0)
 const metrics=[{label:'ห้องว่าง',value:available.length,kind:'green'},{label:'กำลังเข้าพัก',value:occupied.length,kind:'blue'},{label:'เช็กอินวันนี้',value:arrivals.length,kind:'orange'},{label:'เช็กเอาต์วันนี้ / เกินกำหนด',value:departures.length,kind:'plain'}]
 const roomStatus=(r:Room)=>!r.active?'ปิดใช้งาน':r.blocked?'ปิดซ่อม':r.occupants?'เข้าพัก':r.reserved?'จองแล้ว':'ว่าง'
 const roomTone=(r:Room)=>!r.active||r.blocked?'blocked':r.occupants?'occupied':r.reserved?'reserved':'available'
 function chooseRoom(id:string){setUnitId(id);const rate=rooms.find(r=>r.id===id)?.room_details?.nightlyRate;if(rate!==undefined)setGuestNumbers(v=>({...v,nightlyRate:String(rate)}))}
 function saveRoom(e:FormEvent){e.preventDefault();setError('');setNotice('');const name=roomName.trim(),details=parseRoomDetails({...roomDetails,area:roomNumbers.area===''?null:Number(roomNumbers.area),capacity:Number(roomNumbers.capacity),nightlyRate:Number(roomNumbers.nightlyRate),weekendRate:roomNumbers.weekendRate===''?null:Number(roomNumbers.weekendRate)})
  if(!name||!details){setError('กรุณาตรวจสอบรายละเอียดห้อง');return}
  if(preview){
   if(rooms.some(r=>r.name===name&&r.id!==editRoomId)){setError('ชื่อห้องซ้ำ');return}
   const old=rooms.find(r=>r.id===editRoomId)
   if(old&&(!roomActive&&(old.occupants||bookings.some(b=>b.unit_id===old.id&&['confirmed','checked_in'].includes(b.status)&&dateOnly(b.departure_date)>today())))){setError('ห้องมีผู้เข้าพักหรือการจองอยู่');return}
   const room:Room={...(old||{id:crypto.randomUUID(),occupants:0,reserved:false,cleaning:false,blocked:false}),name,active:roomActive,capacity:details.capacity,room_details:details}
   const next=old?rooms.map(r=>r.id===old.id?room:r):[...rooms,room]
   try{localStorage.setItem(PREVIEW_ROOMS_KEY,JSON.stringify(next))}catch{setError('บันทึกข้อมูลในเบราว์เซอร์ไม่ได้');return}
   setRooms(next);setBookings(v=>v.map(b=>b.unit_id===room.id?{...b,unit_name:room.name}:b));resetRoom();setNotice('บันทึกห้องตัวอย่างแล้ว');return
  }
  void act(async()=>{await request('guesthouse-room-save',{propertyId:property.id,name,details,active:roomActive,...(editRoomId?{unitId:editRoomId}:{})});resetRoom();setNotice('บันทึกข้อมูลห้องแล้ว')})
 }
 function createBooking(e:FormEvent){e.preventDefault();
  const bookingDetails={...guest,adults:Number(guestNumbers.adults),children:Number(guestNumbers.children),nightlyRate:Number(guestNumbers.nightlyRate)}
  if(preview){
   if(busy||loading)return
   setError('');setNotice('')
   const parsed=parseBookingDetails(bookingDetails,nights),room=rooms.find(r=>r.id===unitId&&r.active)
   if(!parsed||!room||arrival<today()||departure<=arrival){setError('กรุณาตรวจสอบข้อมูลผู้จอง ห้องพัก วันที่และราคา');return}
   if(room.blocked){setError('ห้องไม่พร้อมให้จอง');return}
   if(bookings.some(b=>b.unit_id===unitId&&['confirmed','checked_in'].includes(b.status)&&dateOnly(b.arrival_date)<departure&&dateOnly(b.departure_date)>arrival)){setError('ห้องนี้ถูกจองในช่วงวันที่เลือกแล้ว กรุณาเลือกห้องหรือวันใหม่');return}
   // Preview is intentionally browser-local. Do not persist contact information.
   const details={...parsed.details,phone:'',email:'',notes:''}
   const next:Booking[]=[...bookings,{id:crypto.randomUUID(),unit_id:room.id,unit_name:room.name,arrival_date:arrival,departure_date:departure,status:'confirmed',total_amount:String(parsed.total),booking_details:details}]
   try{localStorage.setItem(PREVIEW_BOOKINGS_KEY,JSON.stringify(next))}catch{setError('ไม่สามารถบันทึกข้อมูลตัวอย่างในเบราว์เซอร์ได้');return}
   setBookings(next);setMonth(monthStart(arrival));setGuest(v=>({...v,guestName:'',phone:'',email:'',notes:''}));setGuestNumbers({adults:'',children:'',nightlyRate:''});setNotice('บันทึกการจองตัวอย่างแล้ว · ดูรายการในปฏิทินได้');document.getElementById('guesthouse-booking-form')?.previousElementSibling?.scrollIntoView({behavior:'smooth',block:'start'});return
  }
  void act(async()=>{
  const body={action:'create',propertyId:property.id,unitId,arrival,departure,details:bookingDetails}
  const payload=JSON.stringify(body);if(pendingKey.current?.payload!==payload)pendingKey.current={payload,key:crypto.randomUUID()}
  await request('reservations',body,pendingKey.current.key);pendingKey.current=null;setGuest(v=>({...v,guestName:'',phone:'',email:'',notes:''}));setGuestNumbers({adults:'',children:'',nightlyRate:''});setNotice('บันทึกการจองแล้ว')
 })}
 async function settleBooking(id:string){
  if(!preview){await load();return}
  const b=bookings.find(x=>x.id===id)
  if(!b||b.status!=='checked_in')return
  const next=bookings.map(x=>x.id===id?{...x,status:'checked_out',actualCheckOut:new Date().toISOString()}:x)
  const nextRooms=rooms.map(r=>r.id===b.unit_id?{...r,occupants:Math.max(0,r.occupants-1),reserved:next.some(x=>x.unit_id===r.id&&x.status==='confirmed'&&dateOnly(x.arrival_date)<=now&&dateOnly(x.departure_date)>now),cleaning:r.occupants<=1?true:r.cleaning}:r)
  localStorage.setItem(PREVIEW_BOOKINGS_KEY,JSON.stringify(next));localStorage.setItem(PREVIEW_ROOMS_KEY,JSON.stringify(nextRooms))
  setBookings(next);setRooms(nextRooms)
 }
 function changeBooking(b:Booking,action:'cancel'|'check-in'|'check-out'){
  if(preview){
   setError('');setNotice('')
   const current=bookings.find(x=>x.id===b.id),room=rooms.find(r=>r.id===b.unit_id)
   if(!current||!room){setError('ไม่พบรายการจองหรือห้องพัก');return}
   if(action==='check-in'&&(current.status!=='confirmed'||dateOnly(current.arrival_date)>now||dateOnly(current.departure_date)<=now||!room.active||room.blocked||room.occupants>0)){setError('ห้องยังไม่พร้อม หรืออยู่นอกช่วงวันเข้าพัก');return}
   if(action==='check-out'&&current.status!=='checked_in'){setError('รายการนี้ยังไม่ได้เช็กอิน');return}
   if(action==='cancel'&&current.status!=='confirmed'){setError('ไม่สามารถยกเลิกรายการนี้');return}
   if(!window.confirm(action==='check-in'?'ยืนยันเช็กอิน?':action==='check-out'?'ยืนยันเช็กเอาต์?':'ยืนยันยกเลิกการจอง?'))return
   const timestamp=new Date().toISOString()
   const status=action==='check-in'?'checked_in':action==='check-out'?'checked_out':'cancelled'
   const next=bookings.map(x=>x.id===b.id?{...x,status,...(action==='check-in'?{actualCheckIn:timestamp}:action==='check-out'?{actualCheckOut:timestamp}:{})}:x)
   const nextRooms=rooms.map(r=>r.id===room.id?{...r,occupants:action==='check-in'?1:action==='check-out'?0:r.occupants,reserved:next.some(x=>x.unit_id===r.id&&x.status==='confirmed'&&dateOnly(x.arrival_date)<=now&&dateOnly(x.departure_date)>now),cleaning:action==='check-out'?true:r.cleaning}:r)
   try{localStorage.setItem(PREVIEW_BOOKINGS_KEY,JSON.stringify(next));localStorage.setItem(PREVIEW_ROOMS_KEY,JSON.stringify(nextRooms))}catch{setError('ไม่สามารถบันทึกข้อมูลตัวอย่างได้');return}
   setBookings(next);setRooms(nextRooms);setNotice(action==='check-in'?'เช็กอินตัวอย่างสำเร็จ':action==='check-out'?'เช็กเอาต์ตัวอย่างสำเร็จ · ห้องพร้อมรับจอง':'ยกเลิกการจองตัวอย่างแล้ว');return
  }
  if(action!=='check-in'&&!window.confirm(action==='cancel'?'ยืนยันยกเลิกการจอง?':'ยืนยันเช็กเอาต์?'))return
  void act(async()=>{await request('reservations',{action,propertyId:property.id,reservationId:b.id,...(action==='check-in'?{joinRequestId:joinIds[b.id]}:{})});setNotice('บันทึกสถานะแล้ว')})
 }
 function bookingList(items:Booking[]){return <div className={styles.list}>{items.length===0?<p className={styles.muted}>ยังไม่มีรายการ</p>:items.map(b=><article className={styles.booking} key={b.id}><div><strong>ห้อง {b.unit_name}{b.booking_details?' · '+b.booking_details.guestName:''}</strong>{b.booking_details&&<p>{b.booking_details.phone||'ไม่ระบุเบอร์'} · {b.booking_details.email||'ไม่ระบุอีเมล'} · ผู้ใหญ่ {b.booking_details.adults} เด็ก {b.booking_details.children} · {b.booking_details.checkInTime} / {b.booking_details.checkOutTime} · {b.booking_details.source}{b.booking_details.notes?' · '+b.booking_details.notes:''}</p>}<p>{dateOnly(b.arrival_date)} — {dateOnly(b.departure_date)} · {labels[b.status]||b.status}</p><small>ยอดค่าจอง: {b.total_amount===null?'ยังไม่ระบุ':money(Number(b.total_amount))+' บาท'}</small>{b.actualCheckIn&&<p>เช็กอินจริง {new Date(b.actualCheckIn).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})}</p>}{b.actualCheckOut&&<p>เช็กเอาต์จริง {new Date(b.actualCheckOut).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})}</p>}</div><div className={styles.actions}>{b.status==='confirmed'&&<>{!preview&&<select aria-label="คำขอผู้เข้าพัก" value={joinIds[b.id]||''} onChange={e=>setJoinIds(v=>({...v,[b.id]:e.target.value}))}><option value="">เลือกคำขอเข้าพัก</option>{requests.filter(j=>j.status==='pending'&&(!j.unit_id||j.unit_id===b.unit_id)).map(j=><option key={j.id} value={j.id}>{j.email} · {j.id.slice(0,8)}</option>)}</select>}<button disabled={busy||(!preview&&!joinIds[b.id])||dateOnly(b.arrival_date)>now||dateOnly(b.departure_date)<=now} onClick={()=>changeBooking(b,'check-in')}>เช็กอิน</button><button className={styles.secondary} disabled={busy} onClick={()=>changeBooking(b,'cancel')}>ยกเลิก</button></>}{b.status==='checked_in'&&<button disabled={busy} onClick={()=>changeBooking(b,'check-out')}>เช็กเอาต์</button>}</div></article>)}</div>}
 return <SharedAdLayout><main className={dashboard.shell}><div className={dashboard.workspace}>
  <header className={dashboard.header}><div><div className={dashboard.brand}>StayHub <span>Cloud</span></div><p className={dashboard.subtitle}>พื้นที่จัดการ{typeLabel}</p></div><div className={dashboard.account}><span>{property.name}</span>{!preview&&<button className={dashboard.logout} disabled={logoutBusy} onClick={onLogout}>ออกจากระบบ</button>}</div></header>
  <nav className={dashboard.tabs} aria-label={"หมวดจัดการ"+typeLabel}><button type="button" className={dashboard.tab} aria-pressed={tab==='overview'} onClick={()=>setTab('overview')}>ภาพรวม</button>{menus.map(m=><button key={m.id} type="button" className={dashboard.tab} aria-pressed={tab===m.id} onClick={()=>setTab(m.id)}><Icon path={m.icon}/><span>{m.label}</span></button>)}</nav>
  <div className={styles.shell}><div className={styles.heading}><div><h1>{tab==='overview'?'ภาพรวมการเข้าพัก':menus.find(m=>m.id===tab)?.label}</h1><p>{new Intl.DateTimeFormat('th-TH',{dateStyle:'full',timeZone:'Asia/Bangkok'}).format(new Date())}</p></div>{tab==='overview'&&!preview&&<a className={styles.link} href="/cloud/repairs"><Icon path="M14 6a5 5 0 0 0-6 6L3 17l4 4 5-5a5 5 0 0 0 6-6l-4 4-4-4 4-4Z"/><span style={{marginInlineStart:8}}>งานแจ้งซ่อม{repairCount!==''?' · ยังไม่ปิด '+repairCount:''}</span></a>}{tab!=='overview'&&<button className={styles.secondary} onClick={()=>setTab('overview')}>กลับหน้าจัดการ</button>}</div>
  {preview&&<p className={styles.notice}>หน้าทดลอง {typeLabel} · บันทึกห้องและการจองตัวอย่างในเบราว์เซอร์เท่านั้น ไม่เชื่อมฐานข้อมูลจริง โปรดใช้ชื่อสมมติ ไม่บันทึกเบอร์โทร อีเมล หรือหมายเหตุใน Preview</p>}{loading&&<p role="status">กำลังโหลดข้อมูลจริง...</p>}{(error||logoutError)&&<p role="alert" className={styles.error}>{error||logoutError}</p>}{notice&&<p role="status" className={styles.notice}>{notice}</p>}
  {tab==='overview'&&<><div className={styles.metrics}>{metrics.map(m=><button type="button" className={styles.overviewMetric} aria-pressed={overviewDetail===m.kind} key={m.label} onClick={()=>setOverviewDetail(v=>v===m.kind?'':m.kind)}><span>{m.label}</span><strong className={styles[m.kind]}>{loading?'—':m.value}</strong><small>ดูรายละเอียด ›</small></button>)}</div>{overviewDetail&&<section className={styles.panel}><div className={styles.heading}><h2>{metrics.find(m=>m.kind===overviewDetail)?.label}</h2><button type="button" className={styles.secondary} onClick={()=>setOverviewDetail('')}>ปิดรายละเอียด</button></div>{overviewDetail==='green'?<div className={styles.roomGrid}>{available.length?available.map(r=><article className={styles.room} key={r.id}><strong>{r.name}</strong><span className={styles.available}>ว่าง</span><small>{r.room_details?.roomType||''}</small><button type="button" onClick={()=>{chooseRoom(r.id);setTab('bookings')}}>สร้างการจอง</button></article>):<p>ไม่มีห้องว่าง</p>}</div>:bookingList(overviewDetail==='blue'?bookings.filter(b=>b.status==='checked_in'):overviewDetail==='orange'?arrivals:departures)}</section>}<RoomOverview rooms={rooms} loading={loading} error={!!error&&!rooms.length} onRoom={id=>{const room=rooms.find(r=>r.id===id);if(room){editRoom(room);setTab('rooms')}}}/><section className={styles.revenue}><div><small>ยอดค่าจองตามรายการที่บันทึก (ไม่ใช่ยอดรับเงินจริง)</small><strong>฿ {loading?'—':money(bookedValue)}</strong></div><button className={styles.secondary} onClick={()=>setTab('finance')}>ดูรายละเอียด</button></section></>}
  {tab==='bookings'&&<><section className={styles.panel}><div className={styles.heading}><div><h2>ปฏิทินการจอง</h2><p>{monthLabel(month)} – {monthLabel(moveMonth(month,1))}</p></div><div className={styles.actions}><button className={styles.secondary} onClick={()=>setMonth(v=>moveMonth(v,-1))} aria-label="เดือนก่อนหน้า">‹</button><button className={styles.secondary} onClick={goToday}>วันนี้</button><button className={styles.secondary} onClick={()=>setMonth(v=>moveMonth(v,1))} aria-label="เดือนถัดไป">›</button></div></div><div className={styles.legend}><span><i className={styles.legendBooked}/>จองแล้ว</span><span><i className={styles.legendStay}/>เข้าพัก</span><span><i className={styles.legendToday}/>วันนี้</span><small>เลื่อนตารางเพื่อดูวันทั้งหมด</small></div><div ref={calendarRef} className={styles.calendar} tabIndex={0} role="region" aria-label="ปฏิทินห้องพักสองเดือน เลื่อนแนวนอนได้"><table><colgroup><col className={styles.roomColumn}/>{days.map(d=><col key={d} className={styles.dateColumn}/>)}</colgroup><thead><tr><th rowSpan={2} scope="col" className={styles.roomHead}>ห้องพัก</th>{months.map(m=><th key={m.start} scope="colgroup" colSpan={m.days.length} className={styles.monthHead}>{monthLabel(m.start)}</th>)}</tr><tr>{days.map(d=><th key={d} scope="col" data-today={d===now} className={d===now?styles.todayHead:styles.dateHead}><small>{weekday(d)}</small><strong>{Number(d.slice(8))}</strong></th>)}</tr></thead><tbody>{active.map(r=><tr key={r.id}><th scope="row" className={styles.roomHead}>{r.name}</th>{calendarCells(r)}</tr>)}</tbody></table>{!active.length&&<p className={styles.muted}>ยังไม่มีห้องพัก</p>}</div>{focusedBooking&&<div className={styles.selection}><strong>ห้อง {focusedBooking.unit_name} · {focusedBooking.booking_details?.guestName||labels[focusedBooking.status]}</strong>{focusedBooking.booking_details&&<span>เช็กอิน {focusedBooking.booking_details.checkInTime} · เช็กเอาต์ {focusedBooking.booking_details.checkOutTime}</span>}<span>{dateOnly(focusedBooking.arrival_date)} – {dateOnly(focusedBooking.departure_date)}</span><span>{focusedBooking.total_amount===null?'ยังไม่ระบุราคา':money(Number(focusedBooking.total_amount))+' บาท'}</span><button className={styles.secondary} onClick={()=>setFocusedBooking(null)}>ปิด</button></div>}<p className={styles.muted}>เลือกช่องวันที่ว่างเพื่อกรอกการจอง · ตารางแสดงรายการจอง ไม่รวมช่วงปิดซ่อมและงานแม่บ้าน ระบบตรวจความพร้อมก่อนบันทึก</p></section><section className={styles.panel} id="guesthouse-booking-form"><h2>สร้างการจอง</h2><form className={styles.form} onSubmit={createBooking}>
<h3 className={styles.formSection}>ข้อมูลผู้จอง</h3>
<label>ชื่อ–นามสกุล<input required maxLength={120} value={guest.guestName} onChange={e=>updateGuest('guestName',e.target.value)} placeholder="ชื่อผู้จอง"/></label>
<label>เบอร์โทรศัพท์<input type="tel" maxLength={40} value={guest.phone} onChange={e=>updateGuest('phone',e.target.value)} placeholder="เบอร์ติดต่อ"/></label>
<label>อีเมล<input type="email" maxLength={254} value={guest.email} onChange={e=>updateGuest('email',e.target.value)} placeholder="ไม่บังคับ"/></label>
<label>ช่องทางการจอง<select value={guest.source} onChange={e=>updateGuest('source',e.target.value)}>{bookingSources.map((v,i)=><option key={v} value={v}>{['Walk-in','โทรศัพท์','จองตรง','Agoda','Booking.com','อื่นๆ'][i]}</option>)}</select></label>
<label>ผู้ใหญ่<input required type="number" min={1} max={100} value={guestNumbers.adults} onChange={e=>setGuestNumbers(v=>({...v,adults:e.target.value}))}/></label>
<label>เด็ก<input required type="number" min={0} max={100} value={guestNumbers.children} onChange={e=>setGuestNumbers(v=>({...v,children:e.target.value}))}/></label>
<h3 className={styles.formSection}>รายละเอียดการเข้าพัก</h3>
<label>ห้อง<select required value={unitId} onChange={e=>chooseRoom(e.target.value)}><option value="">เลือกห้อง</option>{active.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
<label>จำนวนคืน<input readOnly value={nights} /></label>
<label>วันเช็กอิน<input required type="date" min={now} value={arrival} onChange={e=>{setArrival(e.target.value);if(departure<=e.target.value&&e.target.value)setDeparture(shift(e.target.value,1))}}/></label>
<label>เวลาเช็กอิน<input required type="time" value={guest.checkInTime} onChange={e=>updateGuest('checkInTime',e.target.value)}/></label>
<label>วันเช็กเอาต์<input required type="date" min={arrival?shift(arrival,1):now} value={departure} onChange={e=>setDeparture(e.target.value)}/></label>
<label>เวลาเช็กเอาต์<input required type="time" value={guest.checkOutTime} onChange={e=>updateGuest('checkOutTime',e.target.value)}/></label>
<h3 className={styles.formSection}>ราคาและหมายเหตุ</h3>
<label>ราคาต่อคืน (บาท)<input required type="number" min={0} max={100000000} step="0.01" value={guestNumbers.nightlyRate} onChange={e=>setGuestNumbers(v=>({...v,nightlyRate:e.target.value}))}/></label>
<label>ยอดรวม (บาท)<input readOnly value={money(total)}/></label>
<label className={styles.formSection}>หมายเหตุ<textarea maxLength={1000} rows={3} value={guest.notes} onChange={e=>updateGuest('notes',e.target.value)}/></label>
<button disabled={loading||busy||!unitId||!guest.guestName.trim()||nights<1||nights>365||total>100000000} type="submit">บันทึกการจอง</button></form></section><section className={styles.panel}><h2>รายการจอง</h2>{bookingList(bookings)}</section></>}
  {tab==='rooms'&&<><section className={styles.panel} id="guesthouse-room-form"><h2>{editRoomId?'แก้ไขรายละเอียดห้องพัก '+(rooms.find(r=>r.id===editRoomId)?.name||''):'เพิ่มห้องพัก'}</h2>{editRoomId&&<div className={styles.actions}><button type="button" className={styles.secondary} onClick={()=>{chooseRoom(editRoomId);setTab('bookings')}}>สร้างการจองห้องนี้</button>{!preview&&<a className={styles.link} href={'/cloud/repairs?unitId='+encodeURIComponent(editRoomId)}>งานแจ้งซ่อมห้องนี้</a>}</div>}<form className={styles.form} onSubmit={saveRoom}>
<label>เลขห้อง / ชื่อห้อง<input required maxLength={80} value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="101"/></label>
<label>ชั้น<input maxLength={30} value={roomDetails.floor} onChange={e=>updateRoom('floor',e.target.value)} placeholder="1"/></label>
<label>ประเภทห้อง<input required maxLength={60} value={roomDetails.roomType} onChange={e=>updateRoom('roomType',e.target.value)} placeholder="เช่น ห้องมาตรฐาน / ห้องครอบครัว"/></label>
<label>ประเภทเตียง<input required maxLength={60} value={roomDetails.bedType} onChange={e=>updateRoom('bedType',e.target.value)} placeholder="เช่น เตียงคู่ / เตียงเดี่ยว"/></label>
<label>ขนาดห้อง (ตร.ม.)<input type="number" min="0.01" max="10000" step="0.01" value={roomNumbers.area} onChange={e=>setRoomNumbers(v=>({...v,area:e.target.value}))}/></label>
<label>จำนวนผู้เข้าพักสูงสุด<input required type="number" min="1" max="100" value={roomNumbers.capacity} onChange={e=>setRoomNumbers(v=>({...v,capacity:e.target.value}))}/></label>
<label>ราคาต่อคืน (บาท)<input required type="number" min="0" max="1000000" step="0.01" value={roomNumbers.nightlyRate} onChange={e=>setRoomNumbers(v=>({...v,nightlyRate:e.target.value}))}/></label>
<label>ราคาวันหยุด (บาท)<input type="number" min="0" max="1000000" step="0.01" value={roomNumbers.weekendRate} onChange={e=>setRoomNumbers(v=>({...v,weekendRate:e.target.value}))}/></label>
<fieldset className={styles.formSection}><legend>สิ่งอำนวยความสะดวก</legend><div className={styles.amenities}>{roomAmenities.map(a=><label key={a}><input type="checkbox" checked={roomDetails.amenities.includes(a)} onChange={e=>updateRoom('amenities',e.target.checked?[...roomDetails.amenities,a]:roomDetails.amenities.filter(v=>v!==a))}/>{a}</label>)}</div></fieldset>
<label className={styles.formSection}>ลิงก์รูปภาพห้องพัก (HTTPS)<input type="url" maxLength={500} value={roomDetails.photoUrl} onChange={e=>updateRoom('photoUrl',e.target.value)} placeholder="https://..."/></label>
<label className={styles.formSection}>รายละเอียดเพิ่มเติม<textarea rows={3} maxLength={1000} value={roomDetails.description} onChange={e=>updateRoom('description',e.target.value)}/></label>
<label>สถานะ<select value={roomActive?'active':'inactive'} onChange={e=>setRoomActive(e.target.value==='active')}><option value="active">เปิดใช้งาน</option><option value="inactive">ปิดใช้งาน</option></select></label>
<div className={styles.actions}><button disabled={loading||busy||!roomName.trim()} type="submit">บันทึกห้องพัก</button>{editRoomId&&<button type="button" className={styles.secondary} onClick={resetRoom}>ยกเลิกแก้ไข</button>}</div>
</form></section>{editRoomId&&<section className={styles.panel}><h2>รายการจองและผู้เข้าพักของห้องนี้</h2>{bookingList(bookings.filter(b=>b.unit_id===editRoomId))}</section>}<section className={styles.panel}><h2>สถานะห้องพัก ({rooms.length})</h2><div className={styles.roomGrid}>{rooms.map(r=><article className={styles.room} key={r.id}><strong>{r.name}</strong><span className={styles[roomTone(r)]}>{roomStatus(r)}</span>{r.room_details&&<><small>{r.room_details.roomType} · {r.room_details.bedType}</small><small>{money(r.room_details.nightlyRate)} บาท/คืน · {r.room_details.capacity} คน</small></>}<button type="button" className={styles.secondary} onClick={()=>editRoom(r)}>แก้ไขรายละเอียด</button></article>)}</div>{!rooms.length&&<p>ยังไม่มีห้องพัก</p>}</section></>}
  {tab==='arrivals'&&<><section className={styles.panel}><h2>การเข้าพัก</h2><div className={styles.stayTabs}>{([
   {id:'waiting',label:'รอเช็กอิน',count:bookings.filter(b=>b.status==='confirmed'&&dateOnly(b.arrival_date)<=now&&dateOnly(b.departure_date)>now).length},
   {id:'staying',label:'กำลังเข้าพัก',count:bookings.filter(b=>b.status==='checked_in').length},
   {id:'departing',label:'รอเช็กเอาต์',count:departures.length},
   {id:'history',label:'ประวัติการเข้าพัก',count:bookings.filter(b=>['checked_out','cancelled','no_show'].includes(b.status)).length}
  ] as const).map(t=><button type="button" key={t.id} aria-pressed={arrivalTab===t.id} className={arrivalTab===t.id?styles.stayTabActive:styles.secondary} onClick={()=>setArrivalTab(t.id)}><span>{t.label}</span><strong>{t.count}</strong></button>)}</div><div className={styles.stayFilters}><label>ค้นหาชื่อผู้จอง / ห้อง<input value={staySearch} onChange={e=>setStaySearch(e.target.value)} placeholder="ชื่อผู้จอง หรือ เลขห้อง"/></label><label>วันที่เข้าพัก<input type="date" value={stayDate} onChange={e=>setStayDate(e.target.value)}/></label><button className={styles.secondary} type="button" onClick={()=>{setStaySearch('');setStayDate('')}}>ล้างตัวกรอง</button></div></section>
  <section className={styles.panel}><h2>{{waiting:'รอเช็กอินวันนี้และรายการค้าง',staying:'กำลังเข้าพัก',departing:'รอเช็กเอาต์วันนี้ / เกินกำหนด',history:'ประวัติการเข้าพัก'}[arrivalTab]}</h2>{arrivalTab==='waiting'&&!preview&&<p className={styles.muted}>เลือกคำขอ QR ของผู้เข้าพักที่ตรงกับห้องก่อนเช็กอิน</p>}{arrivalTab==='departing'&&<p className={styles.muted}>ตรวจสอบยอดชำระและเงินมัดจำก่อนเช็กเอาต์: เปิดแท็บรับเงิน / ใบเสร็จเพื่อสรุปบิล หักมัดจำ และบันทึกรับเงินก่อนเช็กเอาต์</p>}{bookingList(bookings.filter(b=>{
   const match=arrivalTab==='waiting'?b.status==='confirmed'&&dateOnly(b.arrival_date)<=now&&dateOnly(b.departure_date)>now:arrivalTab==='staying'?b.status==='checked_in':arrivalTab==='departing'?b.status==='checked_in'&&dateOnly(b.departure_date)<=now:['checked_out','cancelled','no_show'].includes(b.status)
   return match&&(!stayDate||dateOnly(b.arrival_date)<=stayDate&&dateOnly(b.departure_date)>=stayDate)&&(!staySearch.trim()||[b.unit_name,b.booking_details?.guestName||''].some(x=>x.toLowerCase().includes(staySearch.trim().toLowerCase())))
  }))}</section><section className={styles.panel}><h2>ห้องรอทำความสะอาด</h2>{rooms.filter(r=>r.cleaning).length?<div className={styles.roomGrid}>{rooms.filter(r=>r.cleaning).map(r=><article className={styles.room} key={r.id}><strong>{r.name}</strong><span className={styles.cleaning}>รอทำความสะอาด</span>{preview&&<button type="button" className={styles.secondary} onClick={()=>{const next=rooms.map(x=>x.id===r.id?{...x,cleaning:false}:x);try{localStorage.setItem(PREVIEW_ROOMS_KEY,JSON.stringify(next));setRooms(next);setNotice('ทำความสะอาดห้องตัวอย่างเสร็จแล้ว')}catch{setError('บันทึกไม่สำเร็จ')}}}>ทำความสะอาดเสร็จ</button>}</article>)}</div>:<p className={styles.muted}>ไม่มีห้องรอทำความสะอาด</p>}</section></>}
  {tab==='finance'&&<GuesthouseCashier property={property} bookings={bookings} preview={preview} onSettled={settleBooking}/>}
  {tab==='reports'&&<section className={styles.panel}><h2>ภาพรวมจากรายการที่โหลด</h2><div className={styles.metrics}>{metrics.map(m=><div className={styles.metric} key={m.label}><span>{m.label}</span><strong>{loading?'—':m.value}</strong></div>)}</div><p className={styles.muted}>รายการจองล่าสุดสูงสุด 300 รายการ · ไม่ใช่รายงานรายได้จากการรับชำระ</p></section>}
  {tab==='settings'&&<section className={styles.panel}><h2>ข้อมูลที่พัก</h2><p><strong>{property.name}</strong></p><p>ประเภท: {typeLabel} · รายคืน</p>{!preview&&<div className={styles.actions}><a className={styles.link} href="/membership">สถานะสมาชิก</a></div>}</section>}
  <footer className={styles.footer}>StayHub {typeLabel} · {property.name}</footer>
 </div></div></main></SharedAdLayout>
}
