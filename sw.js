/* ============================================================
   LEPUS — Service Worker (cache offline)
   Ao atualizar o app no futuro, mude a versão abaixo
   (lepus-v21 → lepus-v22) para o celular baixar a nova versão.
   v22: tarefas com concluir/editar/excluir seguro.
   v21: suporte à Central de Backup (backup.html) — navegação por
   URL certa + API do GitHub nunca é cacheada.
   ============================================================ */
const CACHE = 'lepus-v22';
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

  /* API do GitHub: SEMPRE rede — nada de respostas velhas no backup */
  if (new URL(req.url).hostname === 'api.github.com') return;

  /* Navegação: cache primeiro na PRÓPRIA URL da visita (o app abre
     instantâneo offline e backup.html tem página própria);
     online, atualiza o cache em segundo plano. */
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match(req).then(hit => {
        const rede = fetch(req)
          .then(res => {
            if (res && res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then(c => c.put(req, copia));
            }
            return res;
          })
          .catch(() => hit || caches.match('./index.html'));
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
