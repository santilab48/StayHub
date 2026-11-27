// Print the existing paid receipt in an isolated document. The operating system
// and installed printer driver choose paper size, orientation, copies and scale.
export function printCashReceipt(source:HTMLElement){
 const frame=document.createElement('iframe')
 frame.title='ใบเสร็จสำหรับพิมพ์'
 frame.setAttribute('aria-hidden','true')
 Object.assign(frame.style,{position:'fixed',right:'0',bottom:'0',width:'100vw',height:'100vh',border:'0',opacity:'0',pointerEvents:'none'})
 document.body.appendChild(frame)
 const doc=frame.contentDocument,win=frame.contentWindow
 if(!doc||!win){frame.remove();throw Error('ไม่สามารถเปิดเอกสารพิมพ์ได้')}
 try{
  doc.open()
  doc.write('<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ใบเสร็จ</title></head><body></body></html>')
  doc.close()
  const style=doc.createElement('style')
  style.textContent=`html,body{margin:0;padding:0;background:#fff;color:#000;color-scheme:light}
   body{font-family:Arial,"Noto Sans Thai",Tahoma,sans-serif;font-size:12px;line-height:1.5}
   main{width:100%;margin:0;box-sizing:border-box;padding:4mm;overflow-wrap:anywhere}
   h2,h3{text-align:center;margin:4px 0}h2{font-size:18px}h3{font-size:15px}
   p{margin:6px 0}table{width:100%;border-collapse:collapse;table-layout:fixed}
   th,td{border-bottom:1px solid #aaa;padding:5px 2px;text-align:left;min-width:0;overflow-wrap:anywhere}
   th:first-child,td:first-child{width:60%}th:last-child,td:last-child{text-align:right;width:40%}
   tr{break-inside:avoid}thead{display:table-header-group}
   .signatures{display:flex;justify-content:space-around;gap:8px;flex-wrap:wrap;margin-top:24px;text-align:center;font-size:10px;break-inside:avoid}
   @media print{html,body{height:auto!important;min-height:0!important}main{break-after:auto}}`
  doc.head.appendChild(style)
  const main=doc.createElement('main')
  for(const child of Array.from(source.childNodes))main.appendChild(doc.importNode(child,true))
  const signatures=main.lastElementChild
  if(signatures)signatures.className='signatures'
  doc.body.appendChild(main)
  win.addEventListener('afterprint',()=>frame.remove(),{once:true})
  win.focus()
  win.print()
 }catch(e){frame.remove();throw e}
}
