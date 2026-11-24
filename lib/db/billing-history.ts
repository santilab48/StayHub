import {periodDate,uuid} from './billing-request'
import {tenantBillAccess} from './tenant-contract-access'

export type BillHistoryFilter={propertyId:string|null;period:string|null;unitId:string|null;status:string|null;limit:number;offset:number}
const statuses=new Set(['unpaid','partial','paid','void'])

export function parseBillHistory(search:URLSearchParams):BillHistoryFilter|null{
  const rawProperty=search.get('propertyId'),rawPeriod=search.get('period'),rawUnit=search.get('unitId'),rawStatus=search.get('status')
  if(rawProperty!==null&&!uuid(rawProperty))return null
  if(rawPeriod!==null&&!periodDate(rawPeriod))return null
  if(rawUnit!==null&&!uuid(rawUnit))return null
  if(rawStatus!==null&&!statuses.has(rawStatus))return null
  const limit=search.get('limit')??'25',page=search.get('page')??'1'
  if(!/^[1-9]\d{0,2}$/.test(limit)||!/^[1-9]\d{0,3}$/.test(page))return null
  const pageNumber=Number(page),size=Number(limit)
  if(size>50||pageNumber>200)return null
  return {propertyId:rawProperty,period:rawPeriod===null?null:periodDate(rawPeriod),unitId:rawUnit,status:rawStatus,limit:size,offset:(pageNumber-1)*size}
}

/** Same property/account/stay snapshot rules apply to list and summary; no active-stay join. */
export const billScope=`b.finalized=true
  AND ($1::uuid IS NULL OR b.property_id=$1::uuid)
  AND ($2::date IS NULL OR b.period=$2::date)
  AND ($3::uuid IS NULL OR b.unit_id=$3::uuid)
  AND ($4::text IS NULL OR b.status=$4::text)
  AND ($5::boolean OR ${tenantBillAccess})`

export function billHistoryArgs(filter:BillHistoryFilter,owner:boolean,accountId:string){
  return [filter.propertyId,filter.period,filter.unitId,filter.status,owner,accountId]
}
