// StayHub PWA shell: cache immutable icon/manifest only.
// NEVER intercept/cache authenticated pages, invoices, tenant API, QR tokens or session data.
const CACHE_NAME='stayhub-public-assets-v1'
const PUBLIC_ASSETS=['/icons/stayhub.svg','/manifest.webmanifest']
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(PUBLIC_ASSETS)))
  self.skipWaiting()
})
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('stayhub-public-assets-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))))
  self.clients.claim()
})
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url)
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!PUBLIC_ASSETS.includes(url.pathname))return
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)))
})
