import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,checkOrigin,stagingAuthEnabled} from '../../../../../../lib/cloud-identity'
import {withPostgresTransaction} from '../../../../../../lib/db/postgres'
import {canManageProperty,requestKey,uuid} from '../../../../../../lib/db/billing-request'
import {cents,formatCents,paymentBalance} from '../../../../../../lib/db/billing-calculation'

export const dynamic='force-dynamic'
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}})
type Params={params:Promise<{billId:string}>}
type Bill={id:string;property_id:string;account_id:string;total:string;status:'unpaid'|'partial'|'paid'|'void';finalized:boolean}
type Payment={id:string;bill_id:string;amount:string;method:'cash'|'transfer';confirmed_by:string;confirmed_at:string;idempotency_key:string}

export async function GET(req:NextRequest,{params}:Params){
  if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
  const account=await accountFromSession()
  if(!account)return reply({error:'Please sign in'},401)
  const propertyId=req.nextUrl.searchParams.get('propertyId'),{billId}=await params
  if(!uuid(propertyId)||!uuid(billId))return reply({error:'Invalid bill or property'},400)
  const rawPage=req.nextUrl.searchParams.get('page')??'1'
  if(!/^[1-9]\d{0,2}$/.test(rawPage)||Number(rawPage)>200)return reply({error:'Invalid page'},400)
  const page=Number(rawPage),limit=50
  try{
    return await withPostgresTransaction(async client=>{
      const bill=await client.query<Bill>(`SELECT id,property_id,account_id,total,status,finalized
        FROM stayhub.billing_bills WHERE property_id=$1 AND id=$2 AND finalized=true`,[propertyId,billId])
      if(!bill.rowCount)return reply({error:'Bill not found'},404)
      const owner=await canManageProperty(client,account.id,propertyId)
      if(!owner&&bill.rows[0].account_id!==account.id)return reply({error:'Bill not found'},404)
      const sum=await client.query<{paid:string}>(`SELECT COALESCE(sum(amount),0)::text AS paid
        FROM stayhub.billing_payments WHERE property_id=$1 AND bill_id=$2`,[propertyId,billId])
      const balance=paymentBalance(bill.rows[0].total,sum.rows[0].paid)
      if(!owner)return reply({billId,status:bill.rows[0].status,total:bill.rows[0].total,
        ...balance,outstanding:bill.rows[0].status==='void'?'0.00':balance.outstanding})
      const payments=await client.query<Payment>(`SELECT id,bill_id,amount,method,confirmed_by,confirmed_at
        FROM stayhub.billing_payments WHERE property_id=$1 AND bill_id=$2
        ORDER BY confirmed_at DESC,id DESC LIMIT $3 OFFSET $4`,[propertyId,billId,limit+1,(page-1)*limit])
      return reply({billId,status:bill.rows[0].status,total:bill.rows[0].total,...balance,
        outstanding:bill.rows[0].status==='void'?'0.00':balance.outstanding,
        payments:payments.rows.slice(0,limit),page,limit,hasMore:payments.rows.length>limit})
    })
  }catch{return reply({error:'Payment history unavailable'},503)}
}

export async function POST(req:NextRequest,{params}:Params){
  if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
  if(!checkOrigin(req))return reply({error:'Invalid origin'},403)
  if(Number(req.headers.get('content-length')||0)>8192)return reply({error:'Payload too large'},413)
  const account=await accountFromSession()
  if(!account)return reply({error:'Please sign in'},401)
  const {billId}=await params
  let body:Record<string,unknown>
  try{body=await req.json();if(!body||typeof body!=='object'||Array.isArray(body))throw Error('bad')}
  catch{return reply({error:'Invalid JSON'},400)}
  const propertyId=body.propertyId,key=requestKey(req.headers.get('idempotency-key'))
  const amountCents=cents(body.amount)
  const method=body.method
  if(!uuid(propertyId)||!uuid(billId)||!key||amountCents===null||amountCents<=0||
    (method!=='cash'&&method!=='transfer'))return reply({error:'Invalid payment request'},400)
  const amount=formatCents(amountCents)
  try{
    const result=await withPostgresTransaction(async client=>{
      if(!await canManageProperty(client,account.id,propertyId))return {error:'forbidden'}
      // Serialize both ordinary payments and replays on this bill, before reading the sum.
      const locked=await client.query<Bill>(`SELECT id,property_id,account_id,total,status,finalized
        FROM stayhub.billing_bills WHERE property_id=$1 AND id=$2 FOR UPDATE`,[propertyId,billId])
      if(!locked.rowCount||!locked.rows[0].finalized)return {error:'bill_not_found'}
      const prior=await client.query<Payment>(`SELECT id,bill_id,amount,method,confirmed_by,confirmed_at,idempotency_key
        FROM stayhub.billing_payments WHERE property_id=$1 AND idempotency_key=$2`,[propertyId,key])
      if(prior.rowCount){
        const old=prior.rows[0]
        if(old.bill_id!==billId||old.method!==method||old.amount!==amount)return {error:'idempotency_conflict'}
        const paid=await client.query<{paid:string}>(`SELECT COALESCE(sum(amount),0)::text AS paid
          FROM stayhub.billing_payments WHERE property_id=$1 AND bill_id=$2`,[propertyId,billId])
        return {paymentId:old.id,replayed:true,status:locked.rows[0].status,
          ...paymentBalance(locked.rows[0].total,paid.rows[0].paid)}
      }
      const bill=locked.rows[0]
      if(bill.status==='paid'||bill.status==='void')return {error:'bill_not_payable'}
      const paid=await client.query<{paid:string}>(`SELECT COALESCE(sum(amount),0)::text AS paid
        FROM stayhub.billing_payments WHERE property_id=$1 AND bill_id=$2`,[propertyId,billId])
      const current=cents(paid.rows[0].paid),total=cents(bill.total)
      if(current===null||total===null||current+amountCents>total)return {error:'payment_exceeds_bill'}
      const saved=await client.query<{id:string}>(`INSERT INTO stayhub.billing_payments
        (property_id,bill_id,amount,method,confirmed_by,idempotency_key)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[propertyId,billId,amount,method,account.id,key])
      // The migration 010 trigger updates bill.status within this same transaction.
      const balance=paymentBalance(bill.total,formatCents(current+amountCents))
      return {paymentId:saved.rows[0].id,replayed:false,status:balance.outstanding==='0.00'?'paid':'partial',...balance}
    })
    if('error' in result)return reply({error:result.error},result.error==='forbidden'?403:409)
    return reply(result,result.replayed?200:201)
  }catch(e){
    const code=(e as {code?:string}).code
    if(code==='23505'||code==='23514'||code==='23503')return reply({error:'payment_conflict'},409)
    return reply({error:'Payment service unavailable'},503)
  }
}
