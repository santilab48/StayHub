'use client'
import {useEffect,useMemo,useState} from 'react'
import {createSupabaseBrowser} from '../lib/supabase-browser'
import SignatureCanvas from './SignatureCanvas'

type Lease={id:string;tenant_id:string;room_id:string;start_date:string;end_date:string|null;rent_amount:number;deposit_amount:number;status:string;contract_version:number;contract_snapshot:any;tenant_signed_at:string|null;admin_signed_at:string|null;final_pdf_path:string|null}
export default function ResidentContractPanel(){
 const supabase=useMemo(()=>createSupabaseBrowser(),[])
 const [lease,setLease]=useState<Lease|null>(null),[roomNo,setRoomNo]=useState('—'),[status,setStatus]=useState('กำลังโหลด...'),[pdfUrl,setPdfUrl]=useState('')
 const load=async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setStatus('กรุณาเข้าสู่ระบบ');return};const {data:p}=await supabase.from('profiles').select('id').eq('auth_user_id',user.id).maybeSingle();if(!p){setStatus('ไม่พบข้อมูลผู้เช่า');return};const {data:l,error}=await supabase.from('leases').select('id,tenant_id,room_id,start_date,end_date,rent_amount,deposit_amount,status,contract_version,contract_snapshot,tenant_signed_at,admin_signed_at,final_pdf_path').eq('profile_id',p.id).in('status',['draft','sent','tenant_signed','active']).order('created_at',{ascending:false}).limit(1).maybeSingle();if(error||!l){setStatus('ยังไม่มีสัญญาที่เปิดให้ดู');return};setLease(l as Lease);const {data:r}=await supabase.from('rooms').select('room_no').eq('id',l.room_id).maybeSingle();setRoomNo(r?.room_no||'—');if(l.final_pdf_path){const {data:u}=await supabase.storage.from('stayhub-contracts').createSignedUrl(l.final_pdf_path,600);setPdfUrl(u?.signedUrl||'')}setStatus('พร้อมอ่านและเซ็น')}
 useEffect(()=>{load()},[])
 const sign=async(blob:Blob)=>{if(!lease)return;setStatus('กำลังบันทึกลายเซ็น...');const path=`${lease.tenant_id}/${lease.id}/tenant-${Date.now()}.png`;const {error:up}=await supabase.storage.from('stayhub-contracts').upload(path,blob,{contentType:'image/png',upsert:false});if(up){setStatus(up.message);return};const {error}=await supabase.rpc('record_contract_signature',{p_lease_id:lease.id,p_signer_role:'tenant',p_signature_path:path,p_user_agent:navigator.userAgent});setStatus(error?error.message:'เซ็นสัญญาแล้ว');if(!error)await load()}
 if(!lease)return <section className="card"><h2>สัญญาปัจจุบัน</h2><p className="muted">{status}</p></section>
 const snap=lease.contract_snapshot||{}
 return <>
  <section className="card"><div className="toolbar"><div><span className="pill">Paperless</span><h2>สัญญาห้อง {roomNo}</h2><p className="muted">Version {lease.contract_version} · {status}</p></div><span className="pill">{lease.status}</span></div></section>
  <section className="section card"><h3>รายละเอียดสัญญา</h3><div className="infoRow"><span className="muted">วันเริ่ม</span><strong>{lease.start_date}</strong></div><div className="infoRow"><span className="muted">วันสิ้นสุด</span><strong>{lease.end_date||'ไม่ระบุ'}</strong></div><div className="infoRow"><span className="muted">ค่าเช่า</span><strong>{Number(lease.rent_amount).toLocaleString()} บาท</strong></div><div className="infoRow"><span className="muted">เงินประกัน</span><strong>{Number(lease.deposit_amount).toLocaleString()} บาท</strong></div>{snap.terms&&<div className="section"><strong>เงื่อนไขเพิ่มเติม</strong><p>{snap.terms}</p></div>}</section>
  <section className="section card"><h3>สถานะการลงนาม</h3><div className="infoRow"><span className="muted">ผู้เช่า</span><strong>{lease.tenant_signed_at?'เซ็นแล้ว '+new Date(lease.tenant_signed_at).toLocaleString('th-TH'):'ยังไม่เซ็น'}</strong></div><div className="infoRow"><span className="muted">เจ้าของ/แอดมิน</span><strong>{lease.admin_signed_at?'เซ็นแล้ว':'ยังไม่เซ็น'}</strong></div></section>
  {!lease.tenant_signed_at&&<section className="section card"><h3>เซ็นสัญญาบนหน้าจอ</h3><p className="muted">ลายเซ็นจะผูกกับสัญญา version นี้และบันทึกเวลาแยกใน audit log</p><SignatureCanvas onSave={sign} label="ยืนยันและบันทึกลายเซ็น"/></section>}
  {lease.final_pdf_path&&<section className="section card"><div className="toolbar"><div><strong>PDF Final · ล็อกแล้ว</strong><p className="muted">ไฟล์นี้เปิดผ่านลิงก์ชั่วคราวตามสิทธิ์ผู้เช่า</p></div>{pdfUrl&&<a className="btn" href={pdfUrl} target="_blank" rel="noreferrer">เปิด PDF สัญญา</a>}</div></section>}
 </>
}
