// Print in an isolated same-origin document, not the dashboard document.
export function printCashReceipt(source:HTMLElement,paper:string){
 const format=['A4','A5','58mm','80mm'].includes(paper)?paper:'A5'
 const thermal=format.endsWith('mm')
 const frame=document.createElement('iframe')
 frame.title='เอกสารบิลเงินสดสำหรับพิมพ์'
 frame.setAttribute('aria-hidden','true')
 Object.assign(frame.style,{position:'fixed',right:'0',bottom:'0',width:'1px',height:'1px',border:'0',opacity:'0',pointerEvents:'none'})
 document.body.appendChild(frame)
 const doc=frame.contentDocument,win=frame.contentWindow
 if(!doc||!win){frame.remove();throw Error('ไม่สามารถเปิดเอกสารพิมพ์ได้')}
 try{
  doc.open()
  doc.write('<!doctype html><html lang="th"><head><meta charset="utf-8"><title>บิลเงินสด</title></head><body></body></html>')
  doc.close()
  const style=doc.createElement('style')
  const margin=thermal?'2mm':'8mm'
  const width=thermal?(format==='58mm'?'54mm':'76mm'):format==='A4'?'194mm':'132mm'
  style.textContent=`@page{size:${thermal?'auto':format};margin:${margin}}html,body{margin:0;padding:0;background:#fff;color:#000;color-scheme:light}body{font-family:Arial,"Noto Sans Thai",Tahoma,sans-serif;font-size:${thermal?'10px':'12px'};line-height:1.5}main{width:100%;max-width:${width};margin:0 auto;box-sizing:border-box;overflow-wrap:anywhere}h2,h3{text-align:center;margin:4px 0}h2{font-size:${thermal?'15px':'20px'}}h3{font-size:${thermal?'12px':'16px'}}p{margin:6px 0}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border-bottom:1px solid #aaa;padding:5px 2px;text-align:left}th:last-child,td:last-child{text-align:right;white-space:nowrap}tr{break-inside:avoid}thead{display:table-header-group}.signatures{display:flex;justify-content:space-around;gap:8px;flex-wrap:wrap;margin-top:24px;text-align:center;font-size:10px;break-inside:avoid}@media print{html,body{height:auto!important;min-height:0!important}main{max-width:${width}}}`
  doc.head.appendChild(style)
  const main=doc.createElement('main')
  // Import text and markup from the existing React receipt. No dashboard CSS or controls.
  for(const child of Array.from(source.childNodes))main.appendChild(doc.importNode(child,true))
  const signatures=main.lastElementChild
  if(signatures)signatures.className='signatures'
  doc.body.appendChild(main)
  const cleanup=()=>frame.remove()
  win.addEventListener('afterprint',cleanup,{once:true})
  // Keep the document available throughout the native print dialog.
  win.focus()
  win.print()
 }catch(e){frame.remove();throw e}
}
