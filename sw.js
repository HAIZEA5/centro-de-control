// ─── SERVICE WORKER ──────────────────────────────────────────────────────────
// Estrategia: cache-first para assets estáticos, network-first para HTML.
// Incrementar CACHE_VERSION cuando se actualicen los assets.
const CACHE_VERSION = 'cdc-v4';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/manifest.json',
  '/icons/icon.svg',
  '/js/utils/store.js',
  '/js/utils/fmt.js',
  '/js/config.js',
  '/js/finanzas_data.js',
  '/js/auth.js',
  '/js/sheets.js',
  '/js/backup.js',
  '/js/dashboard.js',
  '/js/app.js',
  '/js/data/supabase-sync.js',
  '/js/data/oposiciones-seed.js',
  '/js/modules/finanzas.js',
  '/js/modules/piso.js',
  '/js/modules/carnet.js',
  '/js/modules/oposiciones.js',
  '/js/modules/agenda.js',
  '/js/modules/tareas.js',
  '/js/modules/it-txartelas.js',
  '/js/modules/excel.js',
];

// Instalar: pre-cachear assets estáticos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches antiguas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first para JS/CSS/imágenes, network-first para HTML y APIs
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ignorar peticiones a Supabase y CDNs externos (siempre network)
  if (!url.hostname.endsWith('github.io') && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    return;
  }

  // HTML: network-first (para recibir actualizaciones), fallback a cache
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets (JS, CSS, imágenes): cache-first, actualiza en background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || networkFetch;
    })
  );
});
