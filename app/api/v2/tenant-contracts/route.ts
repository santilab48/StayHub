import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession,stagingAuthEnabled} from '../../../../lib/cloud-identity'
import {postgresQuery} from '../../../../lib/db/postgres'
import {uuid} from '../../../../lib/db/billing-request'

export const dynamic='force-dynamic'
export async function GET(req:NextRequest){
  if(!stagingAuthEnabled())return NextResponse.json({error:'Unavailable'},{status:503})
  const account=await accountFromSession(true)
  if(!account)return NextResponse.json({error:'Unauthorized'},{status:401})
  const propertyId=req.nextUrl.searchParams.get('propertyId')
  const unitId=req.nextUrl.searchParams.get('unitId')
  if(!uuid(propertyId)||!uuid(unitId))return NextResponse.json({error:'Invalid room'},{status:400})
  try{
    const r=await postgresQuery(`SELECT c.id,c.snapshot,c.created_at
      FROM stayhub.tenant_contract_access a
      JOIN stayhub.room_contracts c ON c.property_id=a.property_id AND c.id=a.room_contract_id
        AND c.unit_id=a.unit_id
      JOIN stayhub.stays s ON s.property_id=a.property_id AND s.id=a.stay_id
        AND s.account_id=a.account_id AND s.unit_id=a.unit_id
        AND s.starts_at<=now() AND (s.ends_at IS NULL OR s.ends_at>now())
      JOIN stayhub.join_requests r ON r.property_id=s.property_id AND r.id=s.join_request_id
        AND r.account_id=s.account_id AND r.unit_id=s.unit_id AND r.status='approved'
      WHERE a.property_id=$1 AND a.unit_id=$2 AND a.account_id=$3
      ORDER BY c.created_at DESC`,[propertyId,unitId,account.id])
    return NextResponse.json({items:r.rows},{headers:{'Cache-Control':'no-store'}})
  }catch{return NextResponse.json({error:'Unavailable'},{status:503})}
}
