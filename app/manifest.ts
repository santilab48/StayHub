import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StayHub',
    short_name: 'StayHub',
    description: 'จัดการหอพักและบริการผู้เช่าในแอปเดียว',
    start_url: '/my',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f9fc',
    theme_color: '#162033',
    lang: 'th',
    icons: [
      {src:'/icons/stayhub-v3-192.png',type:'image/png',sizes:'192x192',purpose:'any'},
      {src:'/icons/stayhub-v3-512.png',type:'image/png',sizes:'512x512',purpose:'any'},
      {src:'/icons/stayhub-v3-512.png',type:'image/png',sizes:'512x512',purpose:'maskable'},
    ],
  }
}
