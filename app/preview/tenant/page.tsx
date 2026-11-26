import {notFound} from 'next/navigation'
import TenantPreview from './preview'

export const dynamic='force-dynamic'
export default function Page(){
  if(process.env.RAILWAY_ENVIRONMENT_ID!=='ced39691-4fe7-4707-bba7-6d0e801f1ff8')notFound()
  return <TenantPreview/>
}
