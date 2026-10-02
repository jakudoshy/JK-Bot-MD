const CACHE_NAME = 'jk-bot-shell-v4-1-0';
const STATIC_ASSETS = ['/manifest.webmanifest', '/jk-bot-icon.svg', '/Gemini_Generated_Image_dcxxqzdcxxqzdcxx.jpeg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  // Keep the live dashboard, admin routes and Socket.IO network-first.
  if (url.pathname === '/' || url.pathname === '/admin' || url.pathname.startsWith('/socket.io/')) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && (url.pathname === '/manifest.webmanifest' || url.pathname === '/jk-bot-icon.svg' || url.pathname.endsWith('.jpeg'))) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  })));
});
