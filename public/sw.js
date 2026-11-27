// Cache only the local workspace shell and its static code. Authenticated pages and API responses are never cached.
const CACHE_NAME = 'stayhub-local-shell-v3'
const PUBLIC_ASSETS = ['/icons/stayhub-v3-192.png', '/icons/stayhub-v3-512.png', '/icons/stayhub-v3-apple-180.png', '/manifest.webmanifest']
const LOCAL_PAGES = ['/workspace', '/workspace/backup', '/start']
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PUBLIC_ASSETS)))
  self.skipWaiting()
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key =>
    (key.startsWith('stayhub-public-assets-') || key.startsWith('stayhub-local-shell-')) && key !== CACHE_NAME
  ).map(key => caches.delete(key)))))
  self.clients.claim()
})
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  if (PUBLIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)))
    return
  }
  if (!((event.request.mode === 'navigate' && LOCAL_PAGES.includes(url.pathname)) || url.pathname.startsWith('/_next/static/'))) return
  event.respondWith(fetch(event.request).then(async response => {
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(event.request, response.clone())
    }
    return response
  }).catch(() => caches.match(event.request)))
})
