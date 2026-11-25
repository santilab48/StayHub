import './globals.css'
import {validatedBannerUrl} from '../lib/ad-config'
export const metadata = {
  title: 'StayHub',
  description: 'ระบบจัดการที่พักและบิลค่าเช่าในแอปเดียว',
  icons: { icon: '/icons/stayhub.svg', shortcut: '/icons/stayhub.svg' },
}
export const dynamic='force-dynamic'
export default function RootLayout({children}:{children:React.ReactNode}){
 const staging=process.env.RAILWAY_ENVIRONMENT_ID==='ced39691-4fe7-4707-bba7-6d0e801f1ff8'
 const urls=staging?{
  left:validatedBannerUrl(process.env.STAYHUB_AD_LEFT_URL),
  right:validatedBannerUrl(process.env.STAYHUB_AD_RIGHT_URL),
  bottom:validatedBannerUrl(process.env.STAYHUB_AD_BOTTOM_URL),
 }:{left:null,right:null,bottom:null}
 const approved=staging&&process.env.STAYHUB_AD_SITE_ID==='932445'&&process.env.STAYHUB_AD_ALL_AGES_APPROVED==='1'&&Object.values(urls).every(Boolean)
 return <html lang="th" data-ad-mock={staging&&process.env.NEXT_PUBLIC_ENABLE_AD_MOCK==='true'?'true':'false'}
  data-ad-live={approved?'true':'false'} data-ad-left-url={approved?urls.left:undefined}
  data-ad-right-url={approved?urls.right:undefined} data-ad-bottom-url={approved?urls.bottom:undefined}><body>{children}</body></html>
}
