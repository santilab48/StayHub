'use client'

import {useEffect,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../lib/supabase-browser'
import {tenantRoutes} from '../lib/routes'

type Profile={id:string;tenant_id:string;full_name:string|null;phone:string|null;emergency_contact:string|null}
type Lease={id:string;room_id:string;start_date:string;end_date:string|null;rent_amount:number;deposit_amount:number;status:string;tenant_signed_at:string|null;admin_signed_at:string|null;final_pdf_path:string|null}
type Room={id:string;building_id:string|null;room_no:string;floor:string|null;status:string;is_enabled:boolean}
type Building={name:string}
type Portal={delivery_address:string|null;postal_code:string|null;office_phone:string|null;security_phone:string|null;emergency_phone:string|null;wifi_ssid:string|null;wifi_password:string|null;wifi_note:string|null;move_in_date:string|null;keys_issued:number|null;keycards_issued:number|null;handover_condition:string|null;move_out_notice_date:string|null;inspection_date:string|null;move_out_status:string|null;inventory_last_checked_at:string|null}
type Parcel={carrier:string|null;tracking_no:string|null;status:string;arrived_at:string|null}
type Inventory={item_name:string;quantity:number;condition:string|null;updated_at:string|null}

const fmtMoney=(v:number|null|undefined)=>v==null?'—':`${Number(v).toLocaleString('th-TH')} บาท`
const fmtDate=(v:string|null|undefined)=>v?new Date(v).toLocaleDateString('th-TH'):'—'
const Info=({label,value}:{label:string;value:string})=><div className="infoRow"><span className="muted">{label}</span><strong>{value||'—'}</strong></div>

export default function MyRoomOverview({slug}:{slug:string}){
 const supabase=useMemo(()=>createSupabaseBrowser(),[]),r=tenantRoutes(slug)
 const [loading,setLoading]=useState(true),[error,setError]=useState('')
 const [profile,setProfile]=useState<Profile|null>(null),[lease,setLease]=useState<Lease|null>(null),[room,setRoom]=useState<Room|null>(null),[building,setBuilding]=useState<Building|null>(null),[portal,setPortal]=useState<Portal|null>(null),[parcels,setParcels]=useState<Parcel[]>([]),[inventory,setInventory]=useState<Inventory[]>([])

 useEffect(()=>{(async()=>{
  setLoading(true);setError('')
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){setError('กรุณาเข้าสู่ระบบเพื่อดูห้องของฉัน');setLoading(false);return}
  const {data:p,error:pe}=await supabase.from('profiles').select('id,tenant_id,full_name,phone,emergency_contact').eq('auth_user_id',user.id).maybeSingle()
  if(pe||!p){setError(pe?.message||'ไม่พบข้อมูลสมาชิก');setLoading(false);return}
  setProfile(p as Profile)
  const {data:l,error:le}=await supabase.from('leases').select('id,room_id,start_date,end_date,rent_amount,deposit_amount,status,tenant_signed_at,admin_signed_at,final_pdf_path').eq('profile_id',p.id).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(le){setError(le.message);setLoading(false);return}
  if(!l){setError('ยังไม่มีห้องที่ผูกกับสมาชิกนี้');setLoading(false);return}
  setLease(l as Lease)
  const {data:rm,error:re}=await supabase.from('rooms').select('id,building_id,room_no,floor,status,is_enabled').eq('id',l.room_id).maybeSingle()
  if(re||!rm){setError(re?.message||'ไม่พบข้อมูลห้อง');setLoading(false);return}
  setRoom(rm as Room)
  const [bRes,pRes,paRes,iRes]=await Promise.all([
   rm.building_id?supabase.from('buildings').select('name').eq('id',rm.building_id).maybeSingle():Promise.resolve({data:null} as any),
   supabase.from('room_portal_settings').select('delivery_address,postal_code,office_phone,security_phone,emergency_phone,wifi_ssid,wifi_password,wifi_note,move_in_date,keys_issued,keycards_issued,handover_condition,move_out_notice_date,inspection_date,move_out_status,inventory_last_checked_at').eq('room_id',rm.id).maybeSingle(),
   supabase.from('parcels').select('carrier,tracking_no,status,arrived_at').eq('room_id',rm.id).order('arrived_at',{ascending:false}).limit(20),
   supabase.from('room_inventory_items').select('item_name,quantity,condition,updated_at').eq('room_id',rm.id).order('item_name')
  ])
  setBuilding((bRes as any).data||null);setPortal((pRes as any).data||null);setParcels(((paRes as any).data||[]) as Parcel[]);setInventory(((iRes as any).data||[]) as Inventory[])
  setLoading(false)
 })()},[supabase])

 const waiting=parcels.filter(x=>x.status!=='picked_up'),latest=parcels[0]||null
 const abnormal=inventory.filter(x=>x.condition&& !['good','normal','ok','ปกติ','ดี'].includes(String(x.condition).toLowerCase())).length
 const contractStatus=lease?(lease.final_pdf_path?'เซ็นครบ / PDF Final':lease.tenant_signed_at&&lease.admin_signed_at?'เซ็นครบ รอ PDF':lease.tenant_signed_at?'ผู้เช่าเซ็นแล้ว':'รอเซ็น'):'—'
 const contact=portal?.office_phone||portal?.emergency_phone||''
 const delivery=[profile?.full_name,profile?.phone,room?`ห้อง ${room.room_no}${building?.name?` อาคาร ${building.name}`:''}`:'',portal?.delivery_address,portal?.postal_code].filter(Boolean).join('\n')
 const copy=async(text:string,msg:string)=>{if(!text)return;await navigator.clipboard.writeText(text);alert(msg)}

 if(loading)return <section className="section card"><strong>กำลังโหลดห้องของฉัน...</strong></section>
 if(error)return <section className="section card noticeBox"><strong>{error}</strong><p className="muted">หากเพิ่งสมัครสมาชิก ให้เจ้าของหอผูกผู้เช่ากับห้องและสัญญาก่อน</p></section>
 if(!profile||!lease||!room)return null

 return <>
  <section className="roomHero card"><div><span className="eyebrow">MY ROOM</span><h2>ห้อง {room.room_no}{building?.name?` · ${building.name}`:''}</h2><p className="muted">ข้อมูลจริงจากห้องและสัญญาปัจจุบันของคุณ</p></div><span className="pill">{room.is_enabled?'ใช้งานอยู่':'ปิดใช้งาน'}</span></section>

  <div className="metricGrid section">
   <div className="metric"><span className="muted">ห้อง</span><strong>{room.room_no}</strong><small>{building?.name||'ไม่ระบุอาคาร'}{room.floor?` · ชั้น ${room.floor}`:''}</small></div>
   <div className="metric"><span className="muted">ค่าเช่าตามสัญญา</span><strong>{fmtMoney(lease.rent_amount)}</strong><small>สัญญาที่ active</small></div>
   <div className="metric"><span className="muted">สัญญาสิ้นสุด</span><strong>{fmtDate(lease.end_date)}</strong><small>{contractStatus}</small></div>
   <div className="metric"><span className="muted">พัสดุรอรับ</span><strong>{waiting.length}</strong><small>{latest?`ล่าสุด ${fmtDate(latest.arrived_at)}`:'ยังไม่มีพัสดุ'}</small></div>
  </div>

  <section className="section splitGrid">
   <div className="card"><h3>ข้อมูลห้อง</h3><Info label="เลขห้อง" value={room.room_no}/><Info label="อาคาร" value={building?.name||'—'}/><Info label="ชั้น" value={room.floor||'—'}/><Info label="สถานะห้อง" value={room.status||'—'}/></div>
   <div className="card"><h3>ผู้เช่าหลัก</h3><Info label="ชื่อผู้เช่า" value={profile.full_name||'—'}/><Info label="เบอร์โทร" value={profile.phone||'—'}/><Info label="ผู้ติดต่อฉุกเฉิน" value={profile.emergency_contact||'—'}/><Info label="สถานะสัญญา" value={contractStatus}/></div>
  </section>

  <section className="section splitGrid">
   <div className="card"><h3>☎️ ติดต่อหอ</h3><Info label="สำนักงาน / เจ้าของ" value={portal?.office_phone||'—'}/><Info label="รปภ." value={portal?.security_phone||'—'}/><Info label="เบอร์ฉุกเฉิน" value={portal?.emergency_phone||'—'}/>{contact&&<div className="section"><a className="btn secondary" href={`tel:${contact}`}>โทรติดต่อหอ</a></div>}</div>
   <div className="card"><h3>📶 Wi‑Fi ห้อง</h3><Info label="ชื่อเครือข่าย" value={portal?.wifi_ssid||'—'}/><Info label="รหัสผ่าน" value={portal?.wifi_password||'—'}/><Info label="หมายเหตุ" value={portal?.wifi_note||'—'}/>{portal?.wifi_password&&<div className="section"><button type="button" className="btn secondary" onClick={()=>copy(portal.wifi_password!,'คัดลอกรหัส Wi‑Fi แล้ว')}>คัดลอกรหัส Wi‑Fi</button></div>}</div>
  </section>

  <section className="section card"><h3>📦 ที่อยู่จัดส่งพัสดุ</h3><div className="splitGrid"><div><Info label="ชื่อผู้รับ" value={profile.full_name||'—'}/><Info label="เบอร์โทรผู้รับ" value={profile.phone||'—'}/></div><div><Info label="อาคาร / เลขห้อง" value={`${building?.name||''} ${room.room_no}`.trim()}/><Info label="ที่อยู่หอ / รหัสไปรษณีย์" value={`${portal?.delivery_address||'—'} ${portal?.postal_code||''}`.trim()}/></div></div>{delivery&&<div className="section"><button type="button" className="btn secondary" onClick={()=>copy(delivery,'คัดลอกที่อยู่จัดส่งแล้ว')}>คัดลอกที่อยู่จัดส่ง</button></div>}</section>

  <section className="section card"><div className="toolbar"><div><h3>พัสดุที่มาถึงแล้ว</h3><p className="muted">แสดงเฉพาะของห้องนี้</p></div><span className="pill warn">รอรับ {waiting.length} ชิ้น</span></div><Info label="พัสดุล่าสุด" value={latest?.tracking_no||'—'}/><Info label="บริษัทขนส่ง" value={latest?.carrier||'—'}/><Info label="มาถึงเมื่อ" value={fmtDate(latest?.arrived_at)}/><div className="section"><a className="btn secondary" href={r.services}>ดูพัสดุ / บริการ</a></div></section>

  <section className="section splitGrid">
   <div className="card"><h3>🗝️ ข้อมูลรับมอบห้อง</h3><Info label="วันที่เข้าอยู่" value={fmtDate(portal?.move_in_date||lease.start_date)}/><Info label="กุญแจที่รับ" value={portal?.keys_issued==null?'—':`${portal.keys_issued} ดอก`}/><Info label="บัตร / Key Card" value={portal?.keycards_issued==null?'—':`${portal.keycards_issued} ใบ`}/><Info label="สภาพตอนรับมอบ" value={portal?.handover_condition||'—'}/></div>
   <div className="card"><h3>🚪 การย้ายออก</h3><Info label="วันสิ้นสุดตามสัญญา" value={fmtDate(lease.end_date)}/><Info label="แจ้งย้ายออก" value={fmtDate(portal?.move_out_notice_date)}/><Info label="วันที่นัดตรวจห้อง" value={fmtDate(portal?.inspection_date)}/><Info label="สถานะคืนห้อง" value={portal?.move_out_status||'ยังไม่แจ้งย้ายออก'}/></div>
  </section>

  <section className="section card"><div className="toolbar"><div><h3>🛏️ ทรัพย์สินประจำห้อง</h3><p className="muted">รายการที่เจ้าของบันทึกตอนรับมอบห้อง</p></div><a className="btn secondary" href={r.documents}>ดูเอกสารห้อง</a></div><div className="splitGrid"><div><Info label="จำนวนรายการ" value={`${inventory.reduce((s,x)=>s+Number(x.quantity||0),0)} รายการ`}/><Info label="รายการผิดปกติ" value={`${abnormal} รายการ`}/></div><div><Info label="ตรวจล่าสุด" value={fmtDate(portal?.inventory_last_checked_at)}/><Info label="ตัวอย่าง" value={inventory.slice(0,3).map(x=>`${x.item_name} x${x.quantity}`).join(', ')||'—'}/></div></div></section>

  <section className="section card"><h3>สรุปสัญญาปัจจุบัน</h3><div className="splitGrid"><div><Info label="วันเริ่มสัญญา" value={fmtDate(lease.start_date)}/><Info label="วันสิ้นสุด" value={fmtDate(lease.end_date)}/></div><div><Info label="ค่าเช่ารายเดือน" value={fmtMoney(lease.rent_amount)}/><Info label="เงินประกัน" value={fmtMoney(lease.deposit_amount)}/></div></div><div className="section"><a className="btn" href={r.contract}>เปิดสัญญาเช่า</a></div></section>
 </>
}
