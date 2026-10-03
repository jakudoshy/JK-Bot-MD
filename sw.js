const CACHE_NAME = 'jk-bot-shell-v4-1-2';
const STATIC_ASSETS = ['/manifest.webmanifest', '/Gemini_Generated_Image_dcxxqzdcxxqzdcxx.jpeg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  // HTML, admin and Socket.IO always use the live server so deployments appear immediately.
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/admin' || url.pathname.startsWith('/socket.io/')) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && (url.pathname === '/manifest.webmanifest' || url.pathname.endsWith('.jpeg'))) {
      caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    }
    return response;
  })));
});
