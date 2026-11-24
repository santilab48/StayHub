import 'server-only'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import PDFDocument from 'pdfkit'
import type {PoolClient} from 'pg'

type Snapshot={tenant?:string;propertyAddress?:string;dueDay?:string}
type Row={id:string;period:string;total:string;created_at:string;property_name:string;
  unit_name:string;account_id:string|null;email:string|null;snapshot:Snapshot|null}
type Item={fee_code:string;label:string;quantity:string;unit_rate:string;amount:string;
  previous_reading:string|null;current_reading:string|null}
const money=(s:string)=>Number(s).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})
const safe=(s:unknown)=>String(s??'').replace(/[\r\n\t]/g,' ').trim()

export async function createInvoiceDocument(client:PoolClient,propertyId:string,billId:string){
  const r=await client.query<Row>(`SELECT b.id,b.period::text,b.total::text,b.created_at::text,
      b.account_id,p.name AS property_name,u.name AS unit_name,a.email,c.snapshot
    FROM stayhub.billing_bills b
    JOIN stayhub.properties p ON p.id=b.property_id
    JOIN stayhub.units u ON u.property_id=b.property_id AND u.id=b.unit_id
    LEFT JOIN stayhub.accounts a ON a.id=b.account_id
    LEFT JOIN stayhub.room_contracts c ON c.property_id=b.property_id AND c.id=b.room_contract_id
    WHERE b.property_id=$1 AND b.id=$2`,[propertyId,billId])
  if(r.rowCount!==1)throw Error('Invoice bill identity missing')
  const bill=r.rows[0]
  const items=(await client.query<Item>(`SELECT i.fee_code,i.label,i.quantity::text,i.unit_rate::text,
      i.amount::text,m.previous_reading::text,m.current_reading::text
    FROM stayhub.billing_bill_items i
    LEFT JOIN stayhub.billing_meter_readings m ON m.id=i.meter_reading_id AND m.property_id=i.property_id
    WHERE i.property_id=$1 AND i.bill_id=$2 ORDER BY i.fee_code,i.id`,[propertyId,billId])).rows
  if(!items.length)throw Error('Invoice has no line items')
  const sum=items.reduce((n,i)=>n+Math.round(Number(i.amount)*100),0)
  if(sum!==Math.round(Number(bill.total)*100))throw Error('Invoice items do not match bill total')
  if(items.length>14)throw Error('Invoice exceeds one A4 page')
  const pdf=new PDFDocument({size:'A4',margin:40,autoFirstPage:false,compress:true})
  const chunks:Buffer[]=[]
  const complete=new Promise<Buffer>((resolve,reject)=>{
    pdf.on('data',(c:Buffer)=>chunks.push(c))
    pdf.on('error',reject)
    pdf.on('end',()=>resolve(Buffer.concat(chunks)))
  })
  pdf.addPage({size:'A4',margin:40})
  pdf.font(await readFile(join(process.cwd(),'assets/fonts/StayHubThaiLatin-Regular.ttf')))
  const draw=(value:string,x:number,y:number,size=11,color='#1f2e45',width=500)=>{
    pdf.fillColor(color).fontSize(size).text(safe(value),x,y,{width,height:size*1.5,lineBreak:false,ellipsis:true})
  }
  pdf.rect(0,0,595,84).fill('#172b4a')
  draw('ใบแจ้งหนี้ / INVOICE',40,22,22,'#ffffff')
  draw('เอกสารเรียกเก็บเงิน ไม่ใช่ใบเสร็จรับเงิน',40,54,10,'#d1e2f3')
  draw(`ที่พัก: ${bill.property_name}`,40,104,12)
  draw(`ที่อยู่: ${bill.snapshot?.propertyAddress||'ไม่ระบุในข้อมูลที่พัก'}`,40,126,10,'#647085')
  draw(bill.snapshot?.tenant?`ผู้เช่า: ${bill.snapshot.tenant}`:
    bill.email?`บัญชีผู้เช่า: ${bill.email}`:'ยังไม่มีบัญชีผู้เช่าที่ได้รับอนุมัติ',40,150,11)
  draw(`ห้อง: ${bill.unit_name}`,40,172,11)
  draw(`เลขที่บิล: ${bill.id}`,40,194,10)
  draw(`รอบเดือน: ${bill.period.slice(0,7)}    วันที่ออก: ${bill.created_at.slice(0,10)}`,40,215,10)
  const dueDay=Number(bill.snapshot?.dueDay)
  draw(`ครบกำหนดชำระ: ${dueDay>=1&&dueDay<=28?bill.period.slice(0,7)+'-'+String(dueDay).padStart(2,'0'):'ไม่ระบุในสัญญา'}`,40,236,10)
  pdf.rect(40,270,515,27).fill('#e8eef8')
  draw('รายการ',49,276,10);draw('จำนวน / หน่วย',280,276,10);draw('ยอด (บาท)',465,276,10,undefined,88)
  let y=312
  for(const item of items){
    draw(item.label,49,y,10,undefined,220)
    const quantity=item.previous_reading!==null
      ? `${item.previous_reading} ถึง ${item.current_reading} (${item.quantity} x ${money(item.unit_rate)})`
      : `${item.quantity} x ${money(item.unit_rate)}`
    draw(quantity,275,y,9,'#647085',185)
    draw(money(item.amount),465,y,10,undefined,85)
    y+=30
  }
  pdf.moveTo(40,y+30).lineTo(555,y+30).strokeColor('#d5deeb').stroke()
  draw(`ยอดรวม ${money(bill.total)} บาท`,345,y+44,15,undefined,210)
  draw('กรุณาอ้างอิงเลขที่บิลเมื่อชำระเงิน',40,800,9,'#647085')
  pdf.end()
  const bytes=await complete
  if(bytes.length<100||bytes.length>5_000_000)throw Error('Invoice PDF size invalid')
  const sha=createHash('sha256').update(bytes).digest('hex')
  const filename=`stayhub-invoice-${bill.id}.pdf`
  await client.query(`INSERT INTO stayhub.billing_invoice_documents
    (property_id,bill_id,recipient_account_id,pdf,filename,mime_type,sha256)
    VALUES($1,$2,$3,$4,$5,'application/pdf',$6)`,
    [propertyId,billId,bill.account_id,bytes,filename,sha])
}
