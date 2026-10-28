/* Offline: nett først (så nye versjoner kommer med en gang), lagret kopi når nettet mangler.
   Bare filene til denne appen. Pris-fanen henter Malerguiden, som har sin egen offline-støtte. */
const VERSJON = 'malerkalk-1';
const FILER = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSJON).then((c) => c.addAll(FILER)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n.startsWith('malerkalk-') && n !== VERSJON).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  e.respondWith((async () => {
    try {
      const svar = await Promise.race([fetch(e.request), new Promise((_, f) => setTimeout(() => f(new Error('treg')), 2500))]);
      if (svar.ok) { const c = await caches.open(VERSJON); c.put(e.request, svar.clone()); }
      return svar;
    } catch {
      return (await caches.match(e.request, { ignoreSearch: true })) || (await caches.match('./index.html')) || Response.error();
    }
  })());
});
