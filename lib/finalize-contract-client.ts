'use client'

import {PDFDocument} from 'pdf-lib'

const loadImg=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src})
const money=(v:any)=>`${Number(v||0).toLocaleString('th-TH')} บาท`

function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,max:number,line=36){
 const chars=String(text||'').split('');let row='',yy=y
 for(const ch of chars){const test=row+ch;if(ctx.measureText(test).width>max&&row){ctx.fillText(row,x,yy);row=ch;yy+=line}else row=test}
 if(row)ctx.fillText(row,x,yy);return yy
}

export async function finalizeSignedContract({supabase,lease,snapshot,roomNo}:{supabase:any;lease:any;snapshot:any;roomNo:string}){
 if(!lease||lease.final_pdf_path)return {ok:true,already:true}
 const {data:sigs,error:sigErr}=await supabase.from('contract_signatures').select('signer_role,signature_path,signed_at').eq('lease_id',lease.id).order('signed_at',{ascending:true})
 if(sigErr)return {ok:false,error:sigErr.message}
 const latest:Record<string,any>={};for(const s of sigs||[])latest[s.signer_role]=s
 if(!latest.owner||!latest.tenant)return {ok:false,pending:true}
 const [ou,tu]=await Promise.all([
  supabase.storage.from('stayhub-contracts').createSignedUrl(latest.owner.signature_path,120),
  supabase.storage.from('stayhub-contracts').createSignedUrl(latest.tenant.signature_path,120)
 ])
 if(!ou.data?.signedUrl||!tu.data?.signedUrl)return {ok:false,error:'เปิดลายเซ็นเพื่อสร้าง PDF ไม่สำเร็จ'}

 const c=document.createElement('canvas');c.width=1240;c.height=1754;const ctx=c.getContext('2d');if(!ctx)return {ok:false,error:'สร้างเอกสารไม่สำเร็จ'}
 ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#111';ctx.textAlign='center';ctx.font='bold 46px sans-serif';ctx.fillText(snapshot?.title||'สัญญาเช่าห้องพักอาศัย',620,75)
 ctx.textAlign='left';ctx.font='25px sans-serif';let y=135
 const line=(a:string,b:any)=>{ctx.fillText(`${a}: ${b||'—'}`,80,y);y+=40}
 line('ผู้ให้เช่า',snapshot?.lessor?.name);line('ที่อยู่ผู้ให้เช่า',snapshot?.lessor?.address)
 line('ผู้เช่า',snapshot?.lessee?.name);line('โทรศัพท์',snapshot?.lessee?.phone);line('ที่อยู่ห้องเช่า',snapshot?.lessee?.address)
 line('ห้อง',roomNo);line('วันเริ่มสัญญา',snapshot?.start_date);line('วันสิ้นสุดสัญญา',snapshot?.end_date||'ไม่ระบุ')
 line('ค่าเช่าต่อเดือน',money(snapshot?.rent_amount));line('เงินประกัน',money(snapshot?.deposit_amount))
 y+=10;ctx.font='bold 27px sans-serif';ctx.fillText('ข้อตกลงและเงื่อนไข',80,y);y+=40;ctx.font='23px sans-serif'
 const terms=Array.isArray(snapshot?.terms)?snapshot.terms:[snapshot?.terms].filter(Boolean)
 terms.forEach((t:string,i:number)=>{y=wrap(ctx,`${i+1}. ${t}`,90,y,1060,34)+44})
 if(y>1260)y=1260
 const [ownerImg,tenantImg]=await Promise.all([loadImg(ou.data.signedUrl),loadImg(tu.data.signedUrl)])
 ctx.font='24px sans-serif';ctx.fillText('ลงชื่อ ผู้ให้เช่า',110,1410);ctx.fillText('ลงชื่อ ผู้เช่า',700,1410)
 ctx.drawImage(ownerImg,90,1440,380,150);ctx.drawImage(tenantImg,680,1440,380,150)
 ctx.font='20px sans-serif';ctx.fillText(snapshot?.lessor?.name||'',130,1620);ctx.fillText(snapshot?.lessee?.name||'',720,1620)

 const png=c.toDataURL('image/png');const pdf=await PDFDocument.create();const page=pdf.addPage([595.28,841.89]);const image=await pdf.embedPng(png);page.drawImage(image,{x:0,y:0,width:595.28,height:841.89});pdf.setTitle(`StayHub Contract ${roomNo}`)
 const bytes=await pdf.save();const path=`${lease.tenant_id}/${lease.id}/final-v${lease.contract_version}.pdf`;const buffer=new Uint8Array(bytes).buffer
 const {error:up}=await supabase.storage.from('stayhub-contracts').upload(path,new Blob([buffer],{type:'application/pdf'}),{contentType:'application/pdf',upsert:true})
 if(up)return {ok:false,error:up.message}
 const {error}=await supabase.rpc('finalize_contract',{p_lease_id:lease.id,p_pdf_path:path})
 return error?{ok:false,error:error.message}:{ok:true,path}
}
