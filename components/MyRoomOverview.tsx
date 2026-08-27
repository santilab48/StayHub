'use client'

import {useEffect,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../lib/supabase-browser'
import {tenantRoutes} from '../lib/routes'

type Profile={id:string;tenant_id:string;full_name:string|null;phone:string|null;emergency_contact:string|null}
type Lease={id:string;room_id:string;start_date:string;end_date:string|null;rent_amount:number;deposit_amount:number;status:string;tenant_signed_at:string|null;admin_signed_at:string|null;final_pdf_path:string|null}
type Room={id:string;building_id:string|null;room_no:string;floor:string|null;status:string;is_enabled:boolean}
type Building={name:string}
type Portal={delivery_address:string|null;postal_code:string|null;office_phone:string|null;security_phone:string|null;emergency_phone:string|null;wifi_ssid:string|null;wifi_password:string|null;wifi_note:string|null;move_in_date:string|null;keys_issued:number|null;handover_condition:string|null;move_out_notice_date:string|null;inspection_date:string|null;move_out_status:string|null;inventory_last_checked_at:string|null}
type Parcel={carrier:string|null;tracking_no:string|null;status:string;arrived_at:string|null}
type Inventory={item_name:string;quantity:number;condition:string|null;updated_at:string|null}

const fmtMoney=(v:number|null|undefined)=>v==null?'—':`${Number(v).toLocaleString('th-TH')} บาท`
const fmtDate=(v:string|null|undefined)=>v?new Date(v).toLocaleDateString('th-TH'):'—'
const Info=({label,value}:{label:string;value:string})=><div className="myRoomInfo"><span>{label}</span><strong>{value||'—'}</strong></div>

export default function MyRoomOverview({slug}:{slug:string}){
 const supabase=useMemo(()=>createSupabaseBrowser(),[]),r=tenantRoutes(slug)
 const [loading,setLoading]=useState(true),[error,setError]=useState('')
 const [profile,setProfile]=useState<Profile|null>(null),[lease,setLease]=useState<Lease|null>(null),[room,setRoom]=useState<Room|null>(null),[building,setBuilding]=useState<Building|null>(null),[portal,setPortal]=useState<Portal|null>(null),[parcels,setParcels]=useState<Parcel[]>([]),[inventory,setInventory]=useState<Inventory[]>([])
 const [copied,setCopied]=useState('')

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
   supabase.from('room_portal_settings').select('delivery_address,postal_code,office_phone,security_phone,emergency_phone,wifi_ssid,wifi_password,wifi_note,move_in_date,keys_issued,handover_condition,move_out_notice_date,inspection_date,move_out_status,inventory_last_checked_at').eq('room_id',rm.id).maybeSingle(),
   supabase.from('parcels').select('carrier,tracking_no,status,arrived_at').eq('room_id',rm.id).order('arrived_at',{ascending:false}).limit(20),
   supabase.from('room_inventory_items').select('item_name,quantity,condition,updated_at').eq('room_id',rm.id).order('item_name')
  ])
  setBuilding((bRes as any).data||null);setPortal((pRes as any).data||null);setParcels(((paRes as any).data||[]) as Parcel[]);setInventory(((iRes as any).data||[]) as Inventory[])
  setLoading(false)
 })()},[supabase])

 const waiting=parcels.filter(x=>x.status!=='picked_up'),latest=parcels[0]||null
 const abnormal=inventory.filter(x=>x.condition&&!['good','normal','ok','ปกติ','ดี'].includes(String(x.condition).toLowerCase())).length
 const contractStatus=lease?(lease.final_pdf_path?'สัญญาสมบูรณ์':lease.tenant_signed_at&&lease.admin_signed_at?'เซ็นครบ รอเอกสาร':lease.tenant_signed_at?'ผู้เช่าเซ็นแล้ว':'รอเซ็นสัญญา'):'—'
 const contact=portal?.office_phone||portal?.emergency_phone||''
 const delivery=[profile?.full_name,profile?.phone,room?`ห้อง ${room.room_no}${building?.name?` อาคาร ${building.name}`:''}`:'',portal?.delivery_address,portal?.postal_code].filter(Boolean).join('\n')
 const copy=async(text:string,label:string)=>{if(!text)return;await navigator.clipboard.writeText(text);setCopied(label);window.setTimeout(()=>setCopied(''),1800)}

 if(loading)return <section className="myRoomLoading"><div className="myRoomSpinner"/><strong>กำลังโหลดห้องของฉัน</strong></section>
 if(error)return <section className="myRoomEmpty"><div className="myRoomEmptyIcon">🏠</div><h2>{error}</h2><p>เมื่อเจ้าของหอผูกสมาชิกกับห้องและสัญญาแล้ว ข้อมูลจะมาแสดงที่นี่อัตโนมัติ</p></section>
 if(!profile||!lease||!room)return null

 return <div className="myRoomApp">
  <section className="myRoomTopCard">
   <div className="myRoomTopLine"><span className="myRoomTag">ห้องของฉัน</span><span className={`myRoomStatus ${room.is_enabled?'on':'off'}`}>{room.is_enabled?'กำลังเข้าพัก':'ปิดใช้งาน'}</span></div>
   <div className="myRoomRoomNo">{room.room_no}</div>
   <div className="myRoomPlace">{building?.name||'อาคารไม่ระบุ'}{room.floor?` · ชั้น ${room.floor}`:''}</div>
   <div className="myRoomResident">{profile.full_name||'ผู้เช่า'}</div>
   <div className="myRoomHeroStats"><div><span>ค่าเช่า/เดือน</span><strong>{fmtMoney(lease.rent_amount)}</strong></div><div><span>สัญญาถึง</span><strong>{fmtDate(lease.end_date)}</strong></div></div>
  </section>

  <section className="myRoomPrimaryActions">
   <a className="repairPrimary" href={r.repair}><span className="repairPrimaryIcon">🔧</span><span><strong>แจ้งซ่อม</strong><small>ส่งรายละเอียดปัญหาและรูปให้เจ้าของหอ</small></span><b>›</b></a>
   <a className="emergencyPrimary" href={r.services}><span className="repairPrimaryIcon">🚕</span><span><strong>ฉุกเฉิน / เรียกรถ</strong><small>เปิดบริการช่วยเหลือและเรียกรถ</small></span><b>›</b></a>
  </section>

  <section className="myRoomQuickGrid">
   <a href={r.contract}><span>📄</span><strong>สัญญา PDF</strong><small>{lease.final_pdf_path?'เปิดเอกสารฉบับสมบูรณ์':contractStatus}</small></a>
   <a href={r.documents}><span>📘</span><strong>กฎระเบียบหอ</strong><small>อ่านกฎและเอกสารจากเจ้าของ</small></a>
   <a href={r.occupants}><span>👥</span><strong>ผู้พัก</strong><small>ดูรายชื่อที่อนุมัติ</small></a>
   <a href={r.vehicles}><span>🚗</span><strong>รถของฉัน</strong><small>ทะเบียนที่ผูกไว้</small></a>
  </section>

  {waiting.length>0&&<section className="myRoomParcelAlert"><div><span>📦</span><div><strong>มีพัสดุรอรับ {waiting.length} ชิ้น</strong><small>{latest?.carrier||'พัสดุ'} {latest?.tracking_no?`· ${latest.tracking_no}`:''}</small></div></div><a href={r.services}>ดูรายละเอียด</a></section>}

  <section className="myRoomSection"><div className="myRoomSectionHead"><div><span>🏠</span><h3>ข้อมูลห้อง</h3></div><small>ข้อมูลจากเจ้าของหอ</small></div><div className="myRoomPanel"><Info label="เลขห้อง" value={room.room_no}/><Info label="อาคาร" value={building?.name||'—'}/><Info label="ชั้น" value={room.floor||'—'}/><Info label="สถานะ" value={room.status||'—'}/></div></section>

  <section className="myRoomSection"><div className="myRoomSectionHead"><div><span>✍️</span><h3>สัญญาปัจจุบัน</h3></div><a href={r.contract}>เปิดสัญญา PDF ›</a></div><div className="myRoomPanel"><Info label="สถานะ" value={contractStatus}/><Info label="เริ่มสัญญา" value={fmtDate(lease.start_date)}/><Info label="สิ้นสุดสัญญา" value={fmtDate(lease.end_date)}/><Info label="เงินประกัน" value={fmtMoney(lease.deposit_amount)}/></div></section>

  <section className="myRoomSection"><div className="myRoomSectionHead"><div><span>📘</span><h3>กฎระเบียบหอพัก</h3></div><a href={r.documents}>เปิดอ่าน ›</a></div><div className="myRoomPanel"><Info label="เอกสาร" value="กฎระเบียบและข้อปฏิบัติของหอพัก"/><Info label="แหล่งข้อมูล" value="เจ้าของหอเป็นผู้กำหนด"/></div></section>

  <section className="myRoomSection"><div className="myRoomSectionHead"><div><span>📶</span><h3>Wi‑Fi ห้อง</h3></div>{portal?.wifi_password&&<button onClick={()=>copy(portal.wifi_password!,'wifi')}>{copied==='wifi'?'คัดลอกแล้ว ✓':'คัดลอกรหัส'}</button>}</div><div className="myRoomPanel"><Info label="ชื่อ Wi‑Fi" value={portal?.wifi_ssid||'—'}/><Info label="รหัสผ่าน" value={portal?.wifi_password||'—'}/>{portal?.wifi_note&&<Info label="หมายเหตุ" value={portal.wifi_note}/>}</div></section>

  <section className="myRoomSection"><div className="myRoomSectionHead"><div><span>📦</span><h3>ที่อยู่รับพัสดุ</h3></div>{delivery&&<button onClick={()=>copy(delivery,'address')}>{copied==='address'?'คัดลอกแล้ว ✓':'คัดลอกที่อยู่'}</button>}</div><div className="myRoomPanel"><Info label="ผู้รับ" value={profile.full_name||'—'}/><Info label="โทร" value={profile.phone||'—'}/><Info label="ห้อง" value={`${building?.name||''} ${room.room_no}`.trim()}/><Info label="ที่อยู่" value={`${portal?.delivery_address||'—'} ${portal?.postal_code||''}`.trim()}/></div></section>

  <section className="myRoomSection"><div className="myRoomSectionHead"><div><span>🗝️</span><h3>ข้อมูลรับมอบห้อง</h3></div><small>ดูอย่างเดียว</small></div><div className="myRoomPanel"><Info label="วันที่เข้าอยู่" value={fmtDate(portal?.move_in_date||lease.start_date)}/><Info label="กุญแจ" value={portal?.keys_issued==null?'—':`${portal.keys_issued} ดอก`}/><Info label="สภาพตอนรับมอบ" value={portal?.handover_condition||'—'}/></div></section>

  <section className="myRoomSection"><div className="myRoomSectionHead"><div><span>🛏️</span><h3>ทรัพย์สินประจำห้อง</h3></div><a href={r.documents}>ดูเอกสาร ›</a></div><div className="myRoomPanel"><Info label="จำนวน" value={`${inventory.reduce((s,x)=>s+Number(x.quantity||0),0)} รายการ`}/><Info label="รายการผิดปกติ" value={`${abnormal} รายการ`}/><Info label="ตรวจล่าสุด" value={fmtDate(portal?.inventory_last_checked_at)}/><Info label="รายการหลัก" value={inventory.slice(0,3).map(x=>`${x.item_name} x${x.quantity}`).join(', ')||'—'}/></div></section>

  <section className="myRoomSection"><div className="myRoomSectionHead"><div><span>☎️</span><h3>ติดต่อหอ</h3></div>{contact&&<a className="myRoomCall" href={`tel:${contact}`}>โทร</a>}</div><div className="myRoomPanel"><Info label="สำนักงาน / เจ้าของ" value={portal?.office_phone||'—'}/><Info label="รปภ." value={portal?.security_phone||'—'}/><Info label="ฉุกเฉิน" value={portal?.emergency_phone||'—'}/></div></section>

  {(portal?.move_out_notice_date||portal?.inspection_date||portal?.move_out_status)&&<section className="myRoomSection"><div className="myRoomSectionHead"><div><span>🚪</span><h3>การย้ายออก</h3></div><small>ข้อมูลจากเจ้าของหอ</small></div><div className="myRoomPanel"><Info label="แจ้งย้ายออก" value={fmtDate(portal?.move_out_notice_date)}/><Info label="นัดตรวจห้อง" value={fmtDate(portal?.inspection_date)}/><Info label="สถานะ" value={portal?.move_out_status||'—'}/></div></section>}
 </div>
}
