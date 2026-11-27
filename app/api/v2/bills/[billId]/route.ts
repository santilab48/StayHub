import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,stagingAuthEnabled} from '../../../../../lib/cloud-identity'
import {withPostgresTransaction} from '../../../../../lib/db/postgres'
import {canManageProperty,uuid} from '../../../../../lib/db/billing-request'
import {paymentBalance} from '../../../../../lib/db/billing-calculation'
import {canReadBill} from '../../../../../lib/db/tenant-contract-access'

export const dynamic='force-dynamic'
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}})
type Params={params:Promise<{billId:string}>}
type Bill={id:string;property_id:string;account_id:string;unit_id:string;stay_id:string;lease_id:string;
  period:string;total:string;status:'unpaid'|'partial'|'paid'|'void';created_at:string;unit_name:string}

export async function GET(req:NextRequest,{params}:Params){
  if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
  const account=await accountFromSession(req.nextUrl.searchParams.get('tenant')==='1')
  if(!account)return reply({error:'Please sign in'},401)
  const propertyId=req.nextUrl.searchParams.get('propertyId'),{billId}=await params
  if(!uuid(propertyId)||!uuid(billId))return reply({error:'Invalid property or bill'},400)
  try{
    return await withPostgresTransaction(async client=>{
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
      const r=await client.query<Bill>(`SELECT b.id,b.property_id,b.account_id,b.unit_id,b.stay_id,b.lease_id,
        b.period,b.total,b.status,b.created_at,u.name AS unit_name
        FROM stayhub.billing_bills b JOIN stayhub.units u
          ON u.property_id=b.property_id AND u.id=b.unit_id
        WHERE b.property_id=$1 AND b.id=$2 AND b.finalized=true`,[propertyId,billId])
      if(!r.rowCount)return reply({error:'Bill not found'},404)
      const owner=await canManageProperty(client,account.id,propertyId)
      if(!owner&&!await canReadBill(client,propertyId,billId,account.id))return reply({error:'Bill not found'},404)
      const bill=r.rows[0]
      const items=await client.query(`SELECT fee_code AS "feeCode",label,quantity,unit_rate AS "unitRate",amount
        FROM stayhub.billing_bill_items WHERE property_id=$1 AND bill_id=$2 ORDER BY fee_code,id`,[propertyId,billId])
      const sum=await client.query<{paid:string}>(`SELECT COALESCE(sum(amount),0)::text AS paid
        FROM stayhub.billing_payments WHERE property_id=$1 AND bill_id=$2`,[propertyId,billId])
      const amounts=paymentBalance(bill.total,sum.rows[0].paid)
      const balance={...amounts,outstanding:bill.status==='void'?'0.00':amounts.outstanding}
      const document=await client.query(`SELECT 1 FROM stayhub.billing_invoice_documents
        WHERE property_id=$1 AND bill_id=$2`,[propertyId,billId])
      const hasInvoice=document.rowCount===1
      if(!owner)return reply({bill,items:items.rows,...balance,hasInvoice})
      const payments=await client.query(`SELECT id,amount,method,confirmed_by,confirmed_at
        FROM stayhub.billing_payments WHERE property_id=$1 AND bill_id=$2
        ORDER BY confirmed_at DESC,id DESC LIMIT 51`,[propertyId,billId])
      return reply({bill,items:items.rows,...balance,hasInvoice,
        payments:payments.rows.slice(0,50),hasMorePayments:payments.rows.length>50})
    })
  }catch{return reply({error:'Bill detail unavailable'},503)}
}
