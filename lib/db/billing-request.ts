import type {PoolClient} from 'pg'

export const uuid=(value:unknown):value is string=>typeof value==='string'&&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export function periodDate(value:unknown):string|null{
  if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return null
  return `${value}-01`
}

export const requestKey=(value:string|null)=>value&&/^[-\w]{16,128}$/.test(value)?value:null

export async function canManageProperty(client:PoolClient,accountId:string,propertyId:string):Promise<boolean>{
  const r=await client.query(`SELECT 1 FROM stayhub.property_memberships
    WHERE property_id=$1 AND account_id=$2 AND role IN ('owner','admin')`,[propertyId,accountId])
  return r.rowCount===1
}
