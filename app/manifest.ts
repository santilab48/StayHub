import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StayHub',
    short_name: 'StayHub',
    description: 'จัดการหอพักและบริการผู้เช่าในแอปเดียว',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f9fc',
    theme_color: '#162033',
    lang: 'th',
  }
}
