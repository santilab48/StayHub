/** Decimal input boundaries for the numeric(14,3), numeric(12,2) billing schema. */
export function thousandths(value:unknown):number|null{
  if(typeof value!=='string'||!/^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/.test(value))return null
  const [whole,fraction='']=value.split('.')
  const parsed=Number(whole)*1000+Number(fraction.padEnd(3,'0'))
  return Number.isSafeInteger(parsed)?parsed:null
}

export function cents(value:unknown):number|null{
  if(typeof value!=='string'||!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value))return null
  const [whole,fraction='']=value.split('.')
  const parsed=Number(whole)*100+Number(fraction.padEnd(2,'0'))
  return Number.isSafeInteger(parsed)?parsed:null
}

export function meterCharge(previous:string,current:string,rate:string){
  const before=thousandths(previous),after=thousandths(current),unitRate=cents(rate)
  if(before===null||after===null||unitRate===null||after<before)return null
  const usage=after-before
  const exact=(BigInt(usage)*BigInt(unitRate)+500n)/1000n
  if(exact>999999999999n)return null
  const amount=Number(exact)
  return {usage,amount}
}

export function formatCents(value:number):string{
  if(!Number.isSafeInteger(value)||value<0)throw new Error('Invalid cents')
  return `${Math.floor(value/100)}.${String(value%100).padStart(2,'0')}`
}

export function paymentBalance(total:string,paid:string){
  const totalCents=cents(total),paidCents=cents(paid)
  if(totalCents===null||paidCents===null||paidCents>totalCents)throw new Error('Invalid bill balance')
  return {paid:formatCents(paidCents),outstanding:formatCents(totalCents-paidCents)}
}
