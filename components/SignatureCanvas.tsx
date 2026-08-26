'use client'
import {useEffect,useRef,useState} from 'react'
export default function SignatureCanvas({onSave,label='บันทึกลายเซ็น'}:{onSave:(blob:Blob)=>Promise<void>;label?:string}){
 const ref=useRef<HTMLCanvasElement|null>(null),drawing=useRef(false);const [saving,setSaving]=useState(false)
 useEffect(()=>{const c=ref.current;if(!c)return;const rect=c.getBoundingClientRect();c.width=Math.max(600,Math.floor(rect.width*2));c.height=260;const ctx=c.getContext('2d');if(ctx){ctx.scale(2,2);ctx.lineWidth=2;ctx.lineCap='round'}},[])
 const point=(e:React.PointerEvent<HTMLCanvasElement>)=>{const r=e.currentTarget.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
 const down=(e:React.PointerEvent<HTMLCanvasElement>)=>{drawing.current=true;e.currentTarget.setPointerCapture(e.pointerId);const p=point(e),ctx=e.currentTarget.getContext('2d');ctx?.beginPath();ctx?.moveTo(p.x,p.y)}
 const move=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(!drawing.current)return;const p=point(e),ctx=e.currentTarget.getContext('2d');ctx?.lineTo(p.x,p.y);ctx?.stroke()}
 const up=()=>{drawing.current=false}
 const clear=()=>{const c=ref.current;if(!c)return;c.getContext('2d')?.clearRect(0,0,c.width,c.height)}
 const save=()=>{const c=ref.current;if(!c)return;setSaving(true);c.toBlob(async b=>{if(b)await onSave(b);setSaving(false)},'image/png')}
 return <div><canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{width:'100%',height:130,border:'1px dashed #bbb',borderRadius:12,touchAction:'none',background:'#fff'}}/><div className="flow section"><button type="button" className="btn secondary" onClick={clear}>ล้าง</button><button type="button" className="btn" disabled={saving} onClick={save}>{saving?'กำลังบันทึก...':label}</button></div></div>
}
