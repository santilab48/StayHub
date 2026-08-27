'use client'

import {useEffect,useMemo,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {PDFDocument} from 'pdf-lib'
import {createSupabaseBrowser} from '../lib/supabase-browser'
import SignatureCanvas from './SignatureCanvas'

type Room={id:string;room_no:string;monthly_rent:number;deposit_amount:number}
type Profile={id:string;full_name:string|null;phone:string|null}
type Lease={id:string;tenant_id:string;room_id:string;profile_id:string;start_date:string;end_date:string|null;rent_amount:number;deposit_amount:number;status:string;contract_version:number;tenant_signed_at:string|null;admin_signed_at:string|null;final_pdf_path:string|null;contract_snapshot:any}
type Sig={signer_role:string;signature_path:string}

const fmtMoney=(v:number)=>`${Number(v||0).toLocaleString('th-TH')} บาท`
const loadImg=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src})
function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,max:number,line=46){const words=text.split(/\s+/);let row='',yy=y;for(const w of words){const test=row?row+' '+w:w;if(ctx.measureText(test).width>max&&row){ctx.fillText(row,x,yy);row=w;yy+=line}else row=test}if(row)ctx.fillText(row,x,yy);return yy}

export default function ContractManager(){
 const supabase=useMemo(()=>createSupabaseBrowser(),[])
 const search=useSearchParams()
 const contextRoomId=search.get('room_id')||''
 const [tenantId,setTenantId]=useState('')
 const [ownerName,setOwnerName]=useState('เจ้าของหอ')
 const [rooms,setRooms]=useState<Room[]>([])
 const [people,setPeople]=useState<Profile[]>([])
 const [leases,setLeases]=useState<Lease[]>([])
 const [roomId,setRoomId]=useState(contextRoomId)
 const [terms,setTerms]=useState('')
 const [status,setStatus]=useState('กำลังโหลด...')
 const [busy,setBusy]=useState(false)

 const load=async()=>{
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){setStatus('กรุณาเข้าสู่ระบบ');return}
  const {data:p}=await supabase.from('profiles').select('tenant_id,role,full_name').eq('auth_user_id',user.id).maybeSingle()
  if(!p||!['owner','admin','staff'].includes(p.role)){setStatus('ไม่มีสิทธิ์');return}
  setTenantId(p.tenant_id);setOwnerName(p.full_name||'เจ้าของหอ')
  const [{data:r},{data:u},{data:l}]=await Promise.all([
   supabase.from('rooms').select('id,room_no,monthly_rent,deposit_amount').eq('tenant_id',p.tenant_id).eq('is_enabled',true).order('room_no'),
   supabase.from('profiles').select('id,full_name,phone').eq('tenant_id',p.tenant_id).eq('role','tenant').order('full_name'),
   supabase.from('leases').select('id,tenant_id,room_id,profile_id,start_date,end_date,rent_amount,deposit_amount,status,contract_version,tenant_signed_at,admin_signed_at,final_pdf_path,contract_snapshot').eq('tenant_id',p.tenant_id).eq('status','active').order('created_at',{ascending:false})
  ])
  setRooms((r||[]) as Room[]);setPeople((u||[]) as Profile[]);setLeases((l||[]) as Lease[])
  const target=contextRoomId||(roomId||'')
  if(target){setRoomId(target);const activeLease=(l||[]).find((x:any)=>x.room_id===target);setTerms(activeLease?.contract_snapshot?.terms||'')}
  setStatus('เลือกห้อง แล้วข้อมูลผู้เช่าจะขึ้นอัตโนมัติ')
 }
 useEffect(()=>{void load()},[])
 useEffect(()=>{if(contextRoomId)setRoomId(contextRoomId)},[contextRoomId])

 const lease=leases.find(l=>l.room_id===roomId)||null
 const room=rooms.find(r=>r.id===roomId)||null
 const person=lease?people.find(p=>p.id===lease.profile_id)||null:null

 const chooseRoom=(id:string)=>{
  setRoomId(id)
  const activeLease=leases.find(x=>x.room_id===id)
  setTerms(activeLease?.contract_snapshot?.terms||'')
  setStatus(activeLease?'ดึงข้อมูลผู้เช่าจาก active lease ของห้องนี้แล้ว':'ห้องนี้ยังไม่มี active lease')
 }

 const saveContract=async()=>{
  if(!lease||!room||!person){setStatus('ห้องนี้ยังไม่มีข้อมูลผู้เช่าที่ผูกไว้');return}
  if(lease.tenant_signed_at||lease.admin_signed_at||lease.final_pdf_path){setStatus('สัญญานี้เริ่มลงนามแล้ว จึงไม่แก้ข้อมูลต้นทาง');return}
  setBusy(true);setStatus('กำลังบันทึกข้อมูลสัญญา...')
  const snapshot={lessor:{name:ownerName,source:'tenant_admin'},lessee:{name:person.full_name||'',phone:person.phone||''},room:{id:room.id,room_no:room.room_no},start_date:lease.start_date,end_date:lease.end_date,rent_amount:Number(lease.rent_amount),deposit_amount:Number(lease.deposit_amount),terms}
  const {error}=await supabase.from('leases').update({contract_snapshot:snapshot}).eq('id',lease.id).eq('tenant_id',tenantId)
  setBusy(false);setStatus(error?`บันทึกไม่สำเร็จ: ${error.message}`:'บันทึกข้อมูลสัญญาแล้ว · พร้อมลงลายเซ็น 2 ฝ่าย')
  if(!error)await load()
 }

 const signOwner=async(blob:Blob)=>{
  if(!lease||!tenantId)return
  setStatus('กำลังบันทึกลายเซ็นเจ้าของ...')
  const path=`${tenantId}/${lease.id}/owner-${Date.now()}.png`
  const {error:up}=await supabase.storage.from('stayhub-contracts').upload(path,blob,{contentType:'image/png',upsert:false})
  if(up){setStatus(up.message);return}
  const {error}=await supabase.rpc('record_contract_signature',{p_lease_id:lease.id,p_signer_role:'owner',p_signature_path:path,p_user_agent:navigator.userAgent})
  setStatus(error?error.message:'บันทึกลายเซ็นเจ้าของแล้ว')
  if(!error)await load()
 }

 const finalize=async()=>{
  if(!lease||!tenantId||!room)return
  setStatus('กำลังสร้าง PDF Final...')
  const {data:sigs,error:sigErr}=await supabase.from('contract_signatures').select('signer_role,signature_path').eq('lease_id',lease.id).order('signed_at',{ascending:true})
  if(sigErr){setStatus(sigErr.message);return}
  const latest:Record<string,Sig>={};for(const s of (sigs||[]) as Sig[])latest[s.signer_role]=s
  if(!latest.tenant||!latest.owner){setStatus('ต้องมีลายเซ็นผู้เช่าและเจ้าของครบ 2 ฝ่ายก่อน');return}
  const [tu,ou]=await Promise.all([supabase.storage.from('stayhub-contracts').createSignedUrl(latest.tenant.signature_path,120),supabase.storage.from('stayhub-contracts').createSignedUrl(latest.owner.signature_path,120)])
  if(!tu.data?.signedUrl||!ou.data?.signedUrl){setStatus('เปิดลายเซ็นเพื่อสร้าง PDF ไม่สำเร็จ');return}
  const c=document.createElement('canvas');c.width=1240;c.height=1754;const ctx=c.getContext('2d');if(!ctx)return
  ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#111';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.fillText('สัญญาเช่าที่พักอาศัย',620,90);ctx.textAlign='left';ctx.font='30px sans-serif'
  const snap=lease.contract_snapshot||{};let y=170;const line=(a:string,b:string)=>{ctx.fillText(`${a}: ${b}`,90,y);y+=55}
  line('เลขห้อง',room.room_no);line('ผู้เช่า',person?.full_name||snap.lessee?.name||'—');line('โทร',person?.phone||snap.lessee?.phone||'—');line('วันเริ่ม',lease.start_date);line('วันสิ้นสุด',lease.end_date||'ไม่ระบุ');line('ค่าเช่าต่อเดือน',fmtMoney(lease.rent_amount));line('เงินประกัน',fmtMoney(lease.deposit_amount));ctx.font='28px sans-serif';ctx.fillText('เงื่อนไขเพิ่มเติม',90,y);y+=45;wrap(ctx,String(snap.terms||'เป็นไปตามเงื่อนไขที่คู่สัญญาตกลง'),90,y,1060,42)
  const [tenantImg,ownerImg]=await Promise.all([loadImg(tu.data.signedUrl),loadImg(ou.data.signedUrl)]);ctx.font='28px sans-serif';ctx.fillText('ลายเซ็นผู้เช่า',120,1260);ctx.fillText('ลายเซ็นเจ้าของ',700,1260);ctx.drawImage(tenantImg,100,1300,380,170);ctx.drawImage(ownerImg,680,1300,380,170)
  const png=c.toDataURL('image/png');const pdf=await PDFDocument.create();const page=pdf.addPage([595.28,841.89]);const image=await pdf.embedPng(png);page.drawImage(image,{x:0,y:0,width:595.28,height:841.89});pdf.setTitle(`StayHub Contract ${room.room_no}`);const bytes=await pdf.save();const path=`${tenantId}/${lease.id}/final-v${lease.contract_version}.pdf`;const pdfBuffer=new Uint8Array(bytes).buffer
  const {error:up}=await supabase.storage.from('stayhub-contracts').upload(path,new Blob([pdfBuffer],{type:'application/pdf'}),{contentType:'application/pdf',upsert:false});if(up){setStatus(up.message);return}
  const {error}=await supabase.rpc('finalize_contract',{p_lease_id:lease.id,p_pdf_path:path});setStatus(error?error.message:'สร้าง PDF Final และล็อกสัญญาแล้ว');if(!error)await load()
 }

 return <>
  <section className="card">
   <div className="toolbar"><div><h2>ทำสัญญาจากข้อมูลห้อง</h2><p className="muted">เลือกห้องครั้งเดียว ระบบดึงข้อมูลที่เจ้าบ้านกรอกไว้มาใช้ ไม่ต้องกรอกซ้ำ</p></div><span className="pill">{status}</span></div>
   <div className="formGrid section"><label className="span2">ห้อง<select value={roomId} onChange={e=>chooseRoom(e.target.value)} disabled={Boolean(contextRoomId)}><option value="">เลือกห้อง</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.room_no}</option>)}</select></label></div>
   {!roomId?<div className="noticeBox section"><strong>เลือกห้องก่อน</strong></div>:!lease||!room||!person?<div className="noticeBox section"><strong>ห้องนี้ยังไม่มีผู้เช่าที่ผูกไว้</strong><p className="muted">ไปผูกผู้เช่ากับห้องก่อน แล้วกลับมาหน้านี้ข้อมูลจะขึ้นเอง</p></div>:<>
    <div className="card section"><h3>ข้อมูลที่ดึงมาอัตโนมัติ</h3><div className="infoRow"><span className="muted">ห้อง</span><strong>{room.room_no}</strong></div><div className="infoRow"><span className="muted">ผู้เช่า</span><strong>{person.full_name||'—'}</strong></div><div className="infoRow"><span className="muted">โทร</span><strong>{person.phone||'—'}</strong></div><div className="infoRow"><span className="muted">วันเข้าอยู่</span><strong>{lease.start_date}</strong></div><div className="infoRow"><span className="muted">วันสิ้นสุด</span><strong>{lease.end_date||'ไม่ระบุ'}</strong></div><div className="infoRow"><span className="muted">ค่าเช่า</span><strong>{fmtMoney(lease.rent_amount)}</strong></div><div className="infoRow"><span className="muted">เงินประกัน</span><strong>{fmtMoney(lease.deposit_amount)}</strong></div></div>
    <label className="section">เงื่อนไขเพิ่มเติม (ถ้ามี)<textarea rows={4} value={terms} disabled={Boolean(lease.tenant_signed_at||lease.admin_signed_at||lease.final_pdf_path)} onChange={e=>setTerms(e.target.value)} placeholder="เว้นว่างได้"/></label>
    {!lease.tenant_signed_at&&!lease.admin_signed_at&&!lease.final_pdf_path&&<button type="button" className="btn" disabled={busy} onClick={saveContract}>{busy?'กำลังบันทึก...':'บันทึกข้อมูลเป็นสัญญา'}</button>}
   </>}
  </section>

  {lease&&room&&person&&<section className="section card"><h2>ลายเซ็น 2 ฝ่าย</h2><p className="muted">มีเพียงเจ้าของหอและผู้เช่าเท่านั้น</p><div className="grid section">
   <div className="card"><h3>1. เจ้าของหอ</h3><p className="muted">{lease.admin_signed_at?'เซ็นแล้ว '+new Date(lease.admin_signed_at).toLocaleString('th-TH'):'ลงลายเซ็นด้านล่าง'}</p>{!lease.admin_signed_at&&!lease.final_pdf_path&&<SignatureCanvas onSave={signOwner} label="บันทึกลายเซ็นเจ้าของ"/>}</div>
   <div className="card"><h3>2. ผู้เช่า</h3><p className="muted">{lease.tenant_signed_at?'เซ็นแล้ว '+new Date(lease.tenant_signed_at).toLocaleString('th-TH'):'รอผู้เช่ากดเปิดสัญญาจาก “ห้องของฉัน” แล้วเซ็น'}</p><div className="noticeBox section"><strong>{lease.tenant_signed_at?'✓ ผู้เช่าเซ็นแล้ว':'รอลายเซ็นผู้เช่า'}</strong></div></div>
  </div>{lease.tenant_signed_at&&lease.admin_signed_at&&!lease.final_pdf_path&&<button type="button" className="btn" onClick={finalize}>สร้าง PDF Final</button>}{lease.final_pdf_path&&<div className="noticeBox section"><strong>PDF Final · ล็อกแล้ว</strong></div>}</section>}
 </>
}
