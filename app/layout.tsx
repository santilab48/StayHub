import './globals.css'
export const metadata = {
  title: 'StayHub',
  description: 'ระบบจัดการที่พักและบิลค่าเช่าในแอปเดียว',
  icons: { icon: '/icons/stayhub.svg', shortcut: '/icons/stayhub.svg' },
}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="th"><body>{children}</body></html>}
