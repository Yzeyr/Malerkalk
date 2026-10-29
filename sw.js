/* Offline: nett først (så nye versjoner kommer med en gang), lagret kopi når nettet mangler.
   Bare filene til denne appen, og bare i appens egen cache (opphavet deles med andre apper).
   Pris-fanen henter Malerguiden, som har sin egen offline-støtte. */
const VERSJON = 'malerkalk-2';
const FILER = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const VENT_MS = 2500;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSJON).then((c) => c.addAll(FILER)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n.startsWith('malerkalk-') && n !== VERSJON).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});

async function lagret(req) {
  const c = await caches.open(VERSJON);
  return (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match('./index.html') : undefined);
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  // Svaret fra nettet lagres også når det kommer etter tidsfristen
  const nett = fetch(e.request).then(async (svar) => {
    if (svar.ok && svar.type === 'basic') { const c = await caches.open(VERSJON); await c.put(e.request, svar.clone()); }
    return svar;
  });
  e.waitUntil(nett.catch(() => {}));
  e.respondWith((async () => {
    try {
      const svar = await Promise.race([nett, new Promise((_, f) => setTimeout(() => f(new Error('treg')), VENT_MS))]);
      // En feilside fra GitHub Pages (404, 5xx) skal ikke erstatte appen
      if (svar.ok) return svar;
      return (await lagret(e.request)) || svar;
    } catch {
      const kopi = await lagret(e.request);
      if (kopi) return kopi;
      try { return await nett; } catch { return Response.error(); }
    }
  })());
});
