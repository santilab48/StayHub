export type RoomDetails={floor:string;roomType:string;bedType:string;area:number|null;capacity:number;nightlyRate:number;weekendRate:number|null;amenities:string[];description:string;photoUrl:string}
export const defaultRoomDetails:RoomDetails={floor:'',roomType:'Standard',bedType:'Double',area:null,capacity:2,nightlyRate:0,weekendRate:null,amenities:[],description:'',photoUrl:''}
export const roomAmenities=['แอร์','ทีวี','Wi-Fi','ตู้เย็น','เครื่องทำน้ำอุ่น','ระเบียง','ห้องน้ำส่วนตัว'] as const
export function parseRoomDetails(raw:unknown):RoomDetails|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null
 const d=raw as Record<string,unknown>
 const str=(v:unknown,max:number)=>typeof v==='string'&&v.trim().length<=max?v.trim():null
 const floor=str(d.floor,30),roomType=str(d.roomType,60),bedType=str(d.bedType,60),description=str(d.description,1000),photoUrl=str(d.photoUrl,500)
 const amount=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1000000&&Math.abs(v*100-Math.round(v*100))<0.00001
 const capacity=d.capacity
 if(floor===null||!roomType||!bedType||description===null||photoUrl===null||typeof capacity!=='number'||!Number.isInteger(capacity)||capacity<1||capacity>100||!amount(d.nightlyRate)||(d.weekendRate!==null&&!amount(d.weekendRate))||(d.area!==null&&(typeof d.area!=='number'||!Number.isFinite(d.area)||d.area<=0||d.area>10000))||!Array.isArray(d.amenities)||d.amenities.length>20||d.amenities.some(x=>typeof x!=='string'||!roomAmenities.some(a=>a===x)))return null
 if(photoUrl){try{const u=new URL(photoUrl);if(u.protocol!=='https:'||u.username||u.password)return null}catch{return null}}
 return {floor,roomType,bedType,description,photoUrl,capacity,nightlyRate:d.nightlyRate,weekendRate:d.weekendRate as number|null,area:d.area as number|null,amenities:[...new Set(d.amenities as string[])]}
}
