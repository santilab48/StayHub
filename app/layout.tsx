import './globals.css'
import {providerHosts,validatedBannerUrl} from '../lib/ad-config'
export const metadata = {
  title: 'StayHub',
  description: 'ระบบจัดการที่พักและบิลค่าเช่าในแอปเดียว',
  icons: { icon: '/icons/stayhub.svg', shortcut: '/icons/stayhub.svg' },
}
export const dynamic='force-dynamic'
export default function RootLayout({children}:{children:React.ReactNode}){
 const staging=process.env.RAILWAY_ENVIRONMENT_ID==='ced39691-4fe7-4707-bba7-6d0e801f1ff8'
 const hosts=providerHosts(process.env.STAYHUB_AD_ALLOWED_HOSTS)
 const slots={left:process.env.STAYHUB_AD_ENABLE_LEFT!=='false',right:process.env.STAYHUB_AD_ENABLE_RIGHT!=='false',bottom:process.env.STAYHUB_AD_ENABLE_BOTTOM!=='false'}
 const urls=staging?{
  left:validatedBannerUrl(process.env.STAYHUB_AD_LEFT_URL,hosts),
  right:validatedBannerUrl(process.env.STAYHUB_AD_RIGHT_URL,hosts),
  bottom:validatedBannerUrl(process.env.STAYHUB_AD_BOTTOM_URL,hosts),
 }:{left:null,right:null,bottom:null}
 const approved=staging&&process.env.STAYHUB_AD_SITE_ID==='932445'&&process.env.STAYHUB_AD_ALL_AGES_APPROVED==='1'&&Object.entries(urls).some(([key,value])=>slots[key as keyof typeof slots]&&value)
 return <html lang="th" data-ad-mock={staging&&process.env.NEXT_PUBLIC_ENABLE_AD_MOCK==='true'?'true':'false'}
  data-ad-live={approved?'true':'false'} data-ad-hosts={approved?hosts.join(','):undefined}
  data-ad-enable-left={slots.left?'true':'false'} data-ad-enable-right={slots.right?'true':'false'} data-ad-enable-bottom={slots.bottom?'true':'false'}
  data-ad-left-url={approved&&slots.left?urls.left:undefined}
  data-ad-right-url={approved&&slots.right?urls.right:undefined} data-ad-bottom-url={approved&&slots.bottom?urls.bottom:undefined}><body>{children}</body></html>
}
