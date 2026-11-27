import './globals.css'
import {adsenseClientId,validAdsenseSlot} from '../lib/ad-config'
export const metadata = {
  title: 'StayHub',
  description: 'ระบบจัดการที่พักและบิลค่าเช่าในแอปเดียว',
  icons: { icon: '/icons/stayhub-v3-192.png', shortcut: '/icons/stayhub-v3-192.png', apple: '/icons/stayhub-v3-apple-180.png' },
}
export const dynamic='force-dynamic'
export default function RootLayout({children}:{children:React.ReactNode}){
 const staging=process.env.RAILWAY_ENVIRONMENT_ID==='ced39691-4fe7-4707-bba7-6d0e801f1ff8'
 const adsense=process.env.STAYHUB_AD_PROVIDER==='adsense'
 const adsenseSlots={left:validAdsenseSlot(process.env.NEXT_PUBLIC_ADSENSE_LEFT_SLOT),right:validAdsenseSlot(process.env.NEXT_PUBLIC_ADSENSE_RIGHT_SLOT),bottom:validAdsenseSlot(process.env.NEXT_PUBLIC_ADSENSE_BOTTOM_SLOT)}
 const adsenseClient=process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID===adsenseClientId
 // Google approval and Brand safety review must be explicitly recorded before any request.
 const adsenseApproved=staging&&adsense&&adsenseClient&&process.env.STAYHUB_ADSENSE_APPROVED==='true'&&process.env.STAYHUB_AD_ALL_AGES_APPROVED==='1'
 const adsenseEnabled={left:process.env.STAYHUB_AD_LEFT_ENABLED==='true',right:process.env.STAYHUB_AD_RIGHT_ENABLED==='true',bottom:process.env.STAYHUB_AD_BOTTOM_ENABLED==='true'}
 const googleLive=adsenseApproved&&Object.entries(adsenseSlots).some(([key,value])=>adsenseEnabled[key as keyof typeof adsenseEnabled]&&value)
 return <html lang="th" data-ad-provider={adsense?'adsense':'none'} data-ad-mock={staging&&process.env.NEXT_PUBLIC_ENABLE_AD_MOCK==='true'?'true':'false'}
  data-ad-live={googleLive?'true':'false'}
  data-ad-enable-left={adsenseEnabled.left?'true':'false'} data-ad-enable-right={adsenseEnabled.right?'true':'false'} data-ad-enable-bottom={adsenseEnabled.bottom?'true':'false'}
  data-adsense-client={googleLive?adsenseClientId:undefined}
  data-adsense-left-slot={googleLive&&adsenseEnabled.left?adsenseSlots.left:undefined}
  data-adsense-right-slot={googleLive&&adsenseEnabled.right?adsenseSlots.right:undefined}
  data-adsense-bottom-slot={googleLive&&adsenseEnabled.bottom?adsenseSlots.bottom:undefined}><body>{children}</body></html>
}
