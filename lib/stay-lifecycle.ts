import 'server-only'
import type {PoolClient} from 'pg'

// Call inside transaction after locking target unit row FOR UPDATE.
// All state is scoped to the requested property, never just room display name.
export async function ensureUnitCanAccept(client:PoolClient,propertyId:string,unitId:string){
  const unit=await client.query<{capacity:number}>(`
    SELECT capacity FROM stayhub.units
    WHERE id=$1 AND property_id=$2 AND active=true FOR UPDATE`,[unitId,propertyId])
  if(!unit.rowCount)return 'invalid_unit'
  const block=await client.query(`
    SELECT 1 FROM stayhub.unit_blocks
    WHERE property_id=$1 AND unit_id=$2 AND starts_at<=now() AND ends_at>now()
    LIMIT 1`,[propertyId,unitId])
  if(block.rowCount)return 'blocked'
  const cleaning=await client.query(`
    SELECT 1 FROM stayhub.housekeeping_tasks
    WHERE property_id=$1 AND unit_id=$2 AND status IN ('pending','in_progress')
    LIMIT 1`,[propertyId,unitId])
  if(cleaning.rowCount)return 'cleaning'
  const active=await client.query<{count:number}>(`
    SELECT count(*)::integer AS count FROM stayhub.stays
    WHERE property_id=$1 AND unit_id=$2 AND starts_at<=now()
      AND (ends_at IS NULL OR ends_at>now())`,[propertyId,unitId])
  if(active.rows[0].count>=unit.rows[0].capacity)return 'full'
  return 'ok'
}

// Do not strip membership when the account has another current stay in same property.
export async function endStay(client:PoolClient,propertyId:string,stayId:string,actor:string){
  const r=await client.query<{id:string;account_id:string;unit_id:string}>(`
    SELECT id,account_id,unit_id FROM stayhub.stays
    WHERE id=$1 AND property_id=$2 AND starts_at<=now()
      AND (ends_at IS NULL OR ends_at>now()) FOR UPDATE`,[stayId,propertyId])
  if(!r.rowCount)return null
  const stay=r.rows[0]
  await client.query('UPDATE stayhub.stays SET ends_at=now() WHERE id=$1',[stay.id])
  await client.query(`INSERT INTO stayhub.stay_events
    (property_id,stay_id,account_id,actor_account_id,event_type,from_unit_id)
    VALUES($1,$2,$3,$4,'checked_out',$5)`,[propertyId,stay.id,stay.account_id,actor,stay.unit_id])
  // If this unit still has someone checked in, don't schedule cleaning for them.
  const active=await client.query(`SELECT 1 FROM stayhub.stays
    WHERE property_id=$1 AND unit_id=$2 AND starts_at<=now()
    AND (ends_at IS NULL OR ends_at>now()) LIMIT 1`,[propertyId,stay.unit_id])
  if(!active.rowCount){
    await client.query(`INSERT INTO stayhub.housekeeping_tasks
      (property_id,unit_id,triggered_by_stay_id)
      VALUES($1,$2,$3)
      ON CONFLICT (property_id,unit_id) WHERE status IN ('pending','in_progress') DO NOTHING`,
      [propertyId,stay.unit_id,stay.id])
  }
  const other=await client.query(`SELECT 1 FROM stayhub.stays
    WHERE property_id=$1 AND account_id=$2 AND starts_at<=now()
    AND (ends_at IS NULL OR ends_at>now()) LIMIT 1`,[propertyId,stay.account_id])
  if(!other.rowCount){
    await client.query(`DELETE FROM stayhub.property_memberships
      WHERE property_id=$1 AND account_id=$2 AND role IN ('resident','guest')`,
      [propertyId,stay.account_id])
  }
  return stay
}
