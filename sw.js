/* ============================================================
   LEPUS — Service Worker (cache offline)
   Ao atualizar o app no futuro, mude a versão abaixo
   (lepus-v19 → lepus-v20) para o celular baixar a nova versão.
   ============================================================ */
const CACHE = 'lepus-v20';
const SHELL = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  /* Abrir o app: cache primeiro = abre instantâneo offline;
     online, atualiza o cache em segundo plano. */
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(hit => {
        const rede = fetch(req)
          .then(res => {
            if (res && res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then(c => c.put('./index.html', copia));
            }
            return res;
          })
          .catch(() => hit || caches.match('./'));
        return hit || rede;
      })
    );
    return;
  }

  /* Demais recursos: cache primeiro, revalida quando online. */
  e.respondWith(
    caches.match(req).then(hit => {
      const rede = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            caches.open(CACHE).then(c => c.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => hit);
      return hit || rede;
    })
  );
});
