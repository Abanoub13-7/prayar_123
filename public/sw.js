const CACHE_NAME = 'prayar-shell-v2';
const scopeUrl = new URL(self.registration.scope);
const shellUrls = [
  new URL('./', scopeUrl).href,
  new URL('manifest.webmanifest', scopeUrl).href,
  new URL('prayar-icon.svg', scopeUrl).href,
  new URL('favicon.svg', scopeUrl).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(shellUrls))
      .catch((error) => console.warn('Prayar: shell precache skipped', error))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('prayar-shell-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(async () => {
        const cachedPage = await caches.match(request);
        return cachedPage || caches.match(new URL('./', scopeUrl).href);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && url.pathname.startsWith(scopeUrl.pathname)) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
