import type {PoolClient} from 'pg'

export type BillingIdentity={propertyId:string;accountId:string;unitId:string;stayId:string;leaseId:string}
export type BillingMeterType='water'|'electric'
export type BillingStatus='unpaid'|'partial'|'paid'|'void'

/** Server-only check. The caller must separately authorize actor access to property/account. */
export async function lockedBillingIdentity(client:PoolClient,propertyId:string,leaseId:string):Promise<BillingIdentity|null>{
  const r=await client.query<{property_id:string;account_id:string;unit_id:string;stay_id:string;lease_id:string}>(`
    SELECT l.property_id,l.account_id,l.unit_id,l.stay_id,l.id AS lease_id
    FROM stayhub.leases l
    JOIN stayhub.stays s ON (s.property_id,s.id,s.account_id,s.unit_id)=
      (l.property_id,l.stay_id,l.account_id,l.unit_id)
    WHERE l.property_id=$1 AND l.id=$2 AND l.status='active'
    FOR UPDATE OF l,s`,[propertyId,leaseId])
  if(!r.rowCount)return null
  const v=r.rows[0]
  return {propertyId:v.property_id,accountId:v.account_id,unitId:v.unit_id,stayId:v.stay_id,leaseId:v.lease_id}
}

/** Stop automatic utility allocation when occupants overlap or change during the month. */
export async function exclusiveMonthlyStay(client:PoolClient,identity:BillingIdentity,period:string):Promise<boolean>{
  const r=await client.query<{stay_id:string}>(`
    SELECT id AS stay_id FROM stayhub.stays
    WHERE property_id=$1 AND unit_id=$2
      AND starts_at < (($3::date + interval '1 month')::date AT TIME ZONE 'Asia/Bangkok')
      AND (ends_at IS NULL OR ends_at > ($3::date AT TIME ZONE 'Asia/Bangkok'))
    FOR UPDATE`,[identity.propertyId,identity.unitId,period])
  return r.rows.length===1&&r.rows[0].stay_id===identity.stayId
}
