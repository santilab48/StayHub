export type BookingDetails={guestName:string;phone:string;email:string;adults:number;children:number;checkInTime:string;checkOutTime:string;nightlyRate:number;source:string;notes:string}
export const bookingSources=['walk-in','phone','direct','agoda','booking.com','other'] as const
export function parseBookingDetails(raw:unknown,nights:number):{details:BookingDetails;total:number}|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Number.isInteger(nights)||nights<1||nights>365)return null
 const d=raw as Record<string,unknown>
 const str=(v:unknown,max:number)=>typeof v==='string'&&v.trim().length<=max?v.trim():null
 const guestName=str(d.guestName,120),phone=str(d.phone,40),email=str(d.email,254),notes=str(d.notes,1000)
 const time=(v:unknown):v is string=>typeof v==='string'&&/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v)
 const count=(v:unknown,min:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=100
 if(!guestName||phone===null||email===null||notes===null||(email!==''&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||!count(d.adults,1)||!count(d.children,0)||!time(d.checkInTime)||!time(d.checkOutTime)||typeof d.nightlyRate!=='number'||!Number.isFinite(d.nightlyRate)||d.nightlyRate<0||d.nightlyRate>100000000||Math.abs(d.nightlyRate*100-Math.round(d.nightlyRate*100))>0.00001||typeof d.source!=='string'||!bookingSources.some(s=>s===d.source))return null
 const total=Math.round(d.nightlyRate*100)*nights/100
 if(total>100000000)return null
 return {details:{guestName,phone,email,adults:d.adults,children:d.children,checkInTime:d.checkInTime,checkOutTime:d.checkOutTime,nightlyRate:d.nightlyRate,source:d.source,notes},total}
}
