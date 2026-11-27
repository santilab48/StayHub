import type {PoolClient} from 'pg'

/** A contract bill is visible only through an owner-approved, still active stay. */
export const tenantBillAccess=`(b.account_id=$6::uuid OR (
  b.room_contract_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM stayhub.tenant_contract_access a
    JOIN stayhub.stays s ON s.property_id=a.property_id AND s.id=a.stay_id
      AND s.account_id=a.account_id AND s.unit_id=a.unit_id
      AND s.starts_at<=now() AND (s.ends_at IS NULL OR s.ends_at>now())
    JOIN stayhub.join_requests r ON r.property_id=s.property_id AND r.id=s.join_request_id
      AND r.account_id=s.account_id AND r.unit_id=s.unit_id AND r.status='approved'
    WHERE a.property_id=b.property_id AND a.room_contract_id=b.room_contract_id
      AND a.unit_id=b.unit_id AND a.account_id=$6::uuid
  )))`

export async function canReadBill(client:PoolClient,propertyId:string,billId:string,accountId:string){
  const r=await client.query(`SELECT 1 FROM stayhub.billing_bills b
    WHERE b.property_id=$1 AND b.id=$2 AND b.finalized=true
      AND (b.account_id=$3 OR (b.room_contract_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM stayhub.tenant_contract_access a
        JOIN stayhub.stays s ON s.property_id=a.property_id AND s.id=a.stay_id
          AND s.account_id=a.account_id AND s.unit_id=a.unit_id
          AND s.starts_at<=now() AND (s.ends_at IS NULL OR s.ends_at>now())
        JOIN stayhub.join_requests r ON r.property_id=s.property_id AND r.id=s.join_request_id
          AND r.account_id=s.account_id AND r.unit_id=s.unit_id AND r.status='approved'
        WHERE a.property_id=b.property_id AND a.room_contract_id=b.room_contract_id
          AND a.unit_id=b.unit_id AND a.account_id=$3)))`,[propertyId,billId,accountId])
  return r.rowCount===1
}
