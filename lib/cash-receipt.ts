export type ExtraCharge={name:string;amount:number}
export type CashReceipt={id:string;reservation_id:string;number:string;issued_at:string;property_name:string;room_name:string;guest_name:string;arrival:string;departure:string;room_amount:number;extras:ExtraCharge[];deposit:number;discount:number;net:number;method:string}
export function calculateCashBill(room:number,raw:unknown,deposit:unknown,discount:unknown){
 const valid=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100000000&&Math.abs(v*100-Math.round(v*100))<0.00001
 if(!valid(room)||!valid(deposit)||!valid(discount)||!Array.isArray(raw)||raw.length>100)return null
 const extras:ExtraCharge[]=[]
 for(const x of raw){if(!x||typeof x.name!=='string'||!x.name.trim()||x.name.trim().length>120||!valid(x.amount))return null;extras.push({name:x.name.trim(),amount:x.amount})}
 const cents=Math.round(room*100)+extras.reduce((s,x)=>s+Math.round(x.amount*100),0)-Math.round(deposit*100)-Math.round(discount*100)
 if(cents<0||cents>10000000000)return null
 return {room_amount:room,extras,deposit,discount,net:cents/100}
}
