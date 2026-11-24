import {createHash} from 'node:crypto'
import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,stagingAuthEnabled} from '../../../../../../lib/cloud-identity'
import {withPostgresTransaction} from '../../../../../../lib/db/postgres'
import {canManageProperty,uuid} from '../../../../../../lib/db/billing-request'

export const dynamic='force-dynamic'
type Params={params:Promise<{billId:string}>}
const error=(status:number)=>NextResponse.json({error:status===401?'Please sign in':'Invoice not found'},
  {status,headers:{'Cache-Control':'no-store'}})

export async function GET(req:NextRequest,{params}:Params){
  if(!stagingAuthEnabled())return error(404)
  const account=await accountFromSession()
  if(!account)return error(401)
  const propertyId=req.nextUrl.searchParams.get('propertyId'),{billId}=await params
  if(!uuid(propertyId)||!uuid(billId))return error(404)
  try{
    return await withPostgresTransaction(async client=>{
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
      const r=await client.query<{pdf:Buffer;filename:string;sha256:string;recipient_account_id:string|null}>(`
        SELECT d.pdf,d.filename,d.sha256,d.recipient_account_id
        FROM stayhub.billing_invoice_documents d
        JOIN stayhub.billing_bills b ON b.property_id=d.property_id AND b.id=d.bill_id
        WHERE d.property_id=$1 AND d.bill_id=$2 AND b.finalized=true`,[propertyId,billId])
      if(r.rowCount!==1)return error(404)
      const owner=await canManageProperty(client,account.id,propertyId)
      if(!owner&&r.rows[0].recipient_account_id!==account.id)return error(404)
      const doc=r.rows[0]
      if(createHash('sha256').update(doc.pdf).digest('hex')!==doc.sha256)return error(503)
      return new NextResponse(new Uint8Array(doc.pdf),{status:200,headers:{
        'Content-Type':'application/pdf',
        'Content-Disposition':`inline; filename="${doc.filename}"`,
        'Cache-Control':'private, no-store',
        'X-Content-Type-Options':'nosniff',
        'Content-Security-Policy':"default-src 'none'; sandbox",
      }})
    })
  }catch{return error(503)}
}
