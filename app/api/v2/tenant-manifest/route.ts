import {NextRequest,NextResponse} from 'next/server'

export const dynamic='force-dynamic'
export async function GET(req:NextRequest){
  const token=req.nextUrl.searchParams.get('token')
  if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))
    return NextResponse.json({error:'Invalid invitation'},{status:404,headers:{'Cache-Control':'no-store'}})
  return NextResponse.json({
    id:'/my',name:'StayHub ผู้เช่า',short_name:'StayHub',
    start_url:'/join?token='+encodeURIComponent(token),scope:'/',display:'standalone',
    background_color:'#f7f9fc',theme_color:'#162033',lang:'th',
    icons:[{src:'/icons/stayhub.svg',type:'image/svg+xml',sizes:'any',purpose:'any'}],
  },{headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-store'}})
}
