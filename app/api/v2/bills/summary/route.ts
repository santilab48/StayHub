import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,stagingAuthEnabled} from '../../../../../lib/cloud-identity'
import {withPostgresTransaction} from '../../../../../lib/db/postgres'
import {canManageProperty} from '../../../../../lib/db/billing-request'
import {billHistoryArgs,billScope,parseBillHistory} from '../../../../../lib/db/billing-history'

export const dynamic='force-dynamic'
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}})

export async function GET(req:NextRequest){
  if(!stagingAuthEnabled())return reply({error:'Not enabled'},503)
  const account=await accountFromSession()
  if(!account)return reply({error:'Please sign in'},401)
  const filter=parseBillHistory(req.nextUrl.searchParams)
  if(!filter||!filter.propertyId)return reply({error:'Valid propertyId required'},400)
  try{
    return await withPostgresTransaction(async client=>{
      if(!await canManageProperty(client,account.id,filter.propertyId!))return reply({error:'Forbidden'},403)
      const r=await client.query(`WITH scoped AS MATERIALIZED (
          SELECT b.id,b.property_id,b.total,b.status FROM stayhub.billing_bills b WHERE ${billScope}
        ), balances AS (
          SELECT s.total,s.status,COALESCE((SELECT sum(p.amount) FROM stayhub.billing_payments p
            WHERE p.property_id=s.property_id AND p.bill_id=s.id),0) AS paid FROM scoped s
        )
        SELECT count(*)::integer AS "billCount",
          COALESCE(sum(total) FILTER (WHERE status<>'void'),0)::text AS "billedTotal",
          COALESCE(sum(paid) FILTER (WHERE status<>'void'),0)::text AS "paidTotal",
          COALESCE(sum(total-paid) FILTER (WHERE status<>'void'),0)::text AS "outstandingTotal",
          count(*) FILTER (WHERE status IN ('unpaid','partial'))::integer AS "unpaidCount"
        FROM balances`,billHistoryArgs(filter,true,account.id))
      return reply({propertyId:filter.propertyId,filters:{period:filter.period,unitId:filter.unitId,status:filter.status},
        ...r.rows[0]})
    })
  }catch{return reply({error:'Bill summary unavailable'},503)}
}
