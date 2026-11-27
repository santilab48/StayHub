import type {Metadata} from 'next'
import JoinClient from './JoinClient'

type Props={searchParams:Promise<{token?:string}>}
export async function generateMetadata({searchParams}:Props):Promise<Metadata>{
  const token=(await searchParams).token||''
  return {title:'StayHub ผู้เช่า',manifest:'/api/v2/tenant-manifest?token='+encodeURIComponent(token)}
}
export default async function JoinPage({searchParams}:Props){
  return <JoinClient token={(await searchParams).token||''}/>
}
