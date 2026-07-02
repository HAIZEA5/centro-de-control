// ─── SERVICE WORKER ──────────────────────────────────────────────────────────
// Estrategia: network-first para todo (siempre contenido fresco),
// cache solo como fallback offline.
const CACHE_VERSION = 'cdc-v6';

// Instalar: activar inmediatamente sin pre-cachear
self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

// Activar: limpiar caches antiguas y tomar control
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first, cache solo si offline
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ignorar peticiones externas (Supabase, CDNs, etc.)
  if (!url.hostname.endsWith('github.io') && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
