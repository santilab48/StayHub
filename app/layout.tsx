import './globals.css'
export const metadata = {
  title: 'StayHub',
  description: 'ระบบจัดการที่พักและบิลค่าเช่าในแอปเดียว',
  icons: { icon: '/icons/stayhub.svg', shortcut: '/icons/stayhub.svg' },
}
export const dynamic='force-dynamic'
export default function RootLayout({children}:{children:React.ReactNode}){
 const staging=process.env.RAILWAY_ENVIRONMENT_ID==='ced39691-4fe7-4707-bba7-6d0e801f1ff8'
 const approved=staging&&process.env.STAYHUB_AD_SITE_ID==='932445'&&process.env.STAYHUB_AD_ALL_AGES_APPROVED==='1'
 return <html lang="th" data-ad-mock={staging&&process.env.NEXT_PUBLIC_ENABLE_AD_MOCK==='true'?'true':'false'} data-ad-live={approved?'true':'false'}><body>{children}</body></html>
}
