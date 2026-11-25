import './globals.css'
export const metadata = {
  title: 'StayHub',
  description: 'ระบบจัดการที่พักและบิลค่าเช่าในแอปเดียว',
  icons: { icon: '/icons/stayhub.svg', shortcut: '/icons/stayhub.svg' },
}
export const dynamic='force-dynamic'
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="th" data-ad-mock={process.env.RAILWAY_ENVIRONMENT_ID==='ced39691-4fe7-4707-bba7-6d0e801f1ff8' && process.env.NEXT_PUBLIC_ENABLE_AD_MOCK==='true' ? 'true' : 'false'}><body>{children}</body></html>}
