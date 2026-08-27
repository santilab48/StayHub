'use client'

import {useEffect,useMemo,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {createSupabaseBrowser} from '../lib/supabase-browser'
import SignatureCanvas from './SignatureCanvas'
import {buildResidentialLeaseSnapshot} from '../lib/contract-template'
import {finalizeSignedContract} from '../lib/finalize-contract-client'

type Room={id:string;room_no:string}
type Profile={id:string;full_name:string|null;phone:string|null}
type Lease={id:string;tenant_id:string;room_id:string;profile_id:string;start_date:string;end_date:string|null;rent_amount:number;deposit_amount:number;status:string;contract_version:number;tenant_signed_at:string|null;admin_signed_at:string|null;final_pdf_path:string|null;contract_snapshot:any}

export default function ContractManager(){
 const supabase=useMemo(()=>createSupabaseBrowser(),[]),search=useSearchParams()
 const contextRoomId=search.get('room_id')||''
 const [tenantId,setTenantId]=useState(''),[rooms,setRooms]=useState<Room[]>([]),[people,setPeople]=useState<Profile[]>([]),[leases,setLeases]=useState<Lease[]>([])
 const [roomId,setRoomId]=useState(contextRoomId),[ownerName,setOwnerName]=useState(''),[ownerAddress,setOwnerAddress]=useState(''),[roomAddresses,setRoomAddresses]=useState<Record<string,string>>({})
 const [status,setStatus]=useState('กำลังโหลด...')

 const load=async()=>{
  const {data:{user}}=await supabase.auth.getUser();if(!user){setStatus('กรุณาเข้าสู่ระบบ');return}
  const {data:p}=await supabase.from('profiles').select('tenant_id,role,full_name').eq('auth_user_id',user.id).maybeSingle();if(!p||!['owner','admin','staff'].includes(p.role)){setStatus('ไม่มีสิทธิ์');return}
  setTenantId(p.tenant_id)
  const [{data:r},{data:u},{data:l},{data:t},{data:bt},{data:ps}]=await Promise.all([
   supabase.from('rooms').select('id,room_no').eq('tenant_id',p.tenant_id).eq('is_enabled',true).order('room_no'),
   supabase.from('profiles').select('id,full_name,phone').eq('tenant_id',p.tenant_id).eq('role','tenant'),
   supabase.from('leases').select('id,tenant_id,room_id,profile_id,start_date,end_date,rent_amount,deposit_amount,status,contract_version,tenant_signed_at,admin_signed_at,final_pdf_path,contract_snapshot').eq('tenant_id',p.tenant_id).eq('status','active').order('created_at',{ascending:false}),
   supabase.from('tenants').select('name').eq('id',p.tenant_id).maybeSingle(),
   supabase.from('tenant_bill_templates').select('issuer_name,issuer_address').eq('tenant_id',p.tenant_id).eq('is_default',true).order('created_at',{ascending:false}).limit(1).maybeSingle(),
   supabase.from('room_portal_settings').select('room_id,delivery_address,postal_code').eq('tenant_id',p.tenant_id)
  ])
  setRooms((r||[]) as Room[]);setPeople((u||[]) as Profile[]);setLeases((l||[]) as Lease[])
  setOwnerName(bt?.issuer_name||p.full_name||t?.name||'เจ้าของหอ');setOwnerAddress(bt?.issuer_address||'')
  const m:Record<string,string>={};for(const x of ps||[])m[x.room_id]=[x.delivery_address,x.postal_code].filter(Boolean).join(' ');setRoomAddresses(m)
  const wanted=contextRoomId||roomId||(r?.[0]?.id||'');setRoomId(wanted);setStatus('ข้อมูลสัญญาดึงอัตโนมัติ · เหลือเพียงลงลายเซ็น')
 }
 useEffect(()=>{void load()},[])

 const lease=leases.find(x=>x.room_id===roomId)||null,room=rooms.find(x=>x.id===roomId)||null,person=lease?people.find(x=>x.id===lease.profile_id)||null:null
 const snapshot=lease&&room&&person?buildResidentialLeaseSnapshot({ownerName,ownerAddress,tenantName:person.full_name||'',tenantPhone:person.phone,tenantAddress:roomAddresses[room.id]||'',roomNo:room.room_no,startDate:lease.start_date,endDate:lease.end_date,rentAmount:lease.rent_amount,depositAmount:lease.deposit_amount}):null

 const ensureSnapshot=async()=>{if(!lease||!snapshot)return false;if(lease.final_pdf_path)return true;const {error}=await supabase.from('leases').update({contract_snapshot:snapshot}).eq('id',lease.id).eq('tenant_id',tenantId);if(error){setStatus(error.message);return false}return true}
 const signOwner=async(blob:Blob)=>{if(!lease||!room||!snapshot)return;if(!(await ensureSnapshot()))return;setStatus('กำลังบันทึกลายเซ็นเจ้าของ...');const path=`${tenantId}/${lease.id}/owner-${Date.now()}.png`;const {error:up}=await supabase.storage.from('stayhub-contracts').upload(path,blob,{contentType:'image/png'});if(up){setStatus(up.message);return};const {error}=await supabase.rpc('record_contract_signature',{p_lease_id:lease.id,p_signer_role:'owner',p_signature_path:path,p_user_agent:navigator.userAgent});if(error){setStatus(error.message);return};const res=await finalizeSignedContract({supabase,lease:{...lease,contract_snapshot:snapshot},snapshot,roomNo:room.room_no});setStatus(res.ok?'ลายเซ็นครบแล้ว · สร้าง PDF Final แล้ว':res.pending?'บันทึกลายเซ็นเจ้าของแล้ว · รอผู้เช่าเซ็น':res.error||'บันทึกลายเซ็นแล้ว');await load()}

 return <>
  <section className="card"><div className="toolbar"><div><h2>สัญญาเช่าห้องพัก</h2><p className="muted">เลือกห้องแล้วข้อมูลเดิมทั้งหมดจะถูกนำมาใส่สัญญาอัตโนมัติ</p></div><span className="pill">{status}</span></div><div className="formGrid section"><label>ห้อง<select value={roomId} onChange={e=>setRoomId(e.target.value)} disabled={Boolean(contextRoomId)}><option value="">เลือกห้อง</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.room_no}</option>)}</select></label></div></section>
  {snapshot&&lease&&room&&person&&<>
   <section className="section card"><h2>{snapshot.title}</h2><div className="infoRow"><span>ผู้ให้เช่า</span><strong>{snapshot.lessor.name}</strong></div><div className="infoRow"><span>ที่อยู่ผู้ให้เช่า</span><strong>{snapshot.lessor.address||'—'}</strong></div><div className="infoRow"><span>ผู้เช่า</span><strong>{snapshot.lessee.name}</strong></div><div className="infoRow"><span>โทร</span><strong>{snapshot.lessee.phone||'—'}</strong></div><div className="infoRow"><span>ที่อยู่ห้องเช่า</span><strong>{snapshot.lessee.address||'—'}</strong></div><div className="infoRow"><span>ห้อง</span><strong>{room.room_no}</strong></div><div className="infoRow"><span>ระยะสัญญา</span><strong>{lease.start_date} → {lease.end_date||'ไม่ระบุ'}</strong></div><div className="infoRow"><span>ค่าเช่า</span><strong>{Number(lease.rent_amount).toLocaleString('th-TH')} บาท/เดือน</strong></div><div className="infoRow"><span>เงินประกัน</span><strong>{Number(lease.deposit_amount).toLocaleString('th-TH')} บาท</strong></div><div className="section"><h3>ข้อตกลง</h3><ol>{snapshot.terms.map((x:string,i:number)=><li key={i} style={{marginBottom:8}}>{x}</li>)}</ol></div></section>
   <section className="section card"><h2>ลายเซ็น 2 ฝ่าย</h2><div className="grid section"><div className="card"><h3>เจ้าของหอ</h3>{lease.admin_signed_at?<div className="noticeBox">✓ เซ็นแล้ว</div>:<SignatureCanvas onSave={signOwner} label="เซ็นและบันทึกลายเซ็นเจ้าของ"/>}</div><div className="card"><h3>ผู้เช่า</h3><div className="noticeBox">{lease.tenant_signed_at?'✓ ผู้เช่าเซ็นแล้ว':'รอผู้เช่าเปิด “ห้องของฉัน” แล้วเซ็น'}</div></div></div>{lease.final_pdf_path&&<div className="noticeBox section"><strong>✓ PDF Final ถูกสร้างและฝังลายเซ็นครบแล้ว</strong></div>}</section>
  </>}
 </>
}
