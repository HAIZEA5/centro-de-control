// ─── SERVICE WORKER — Centro de Control ───
const CACHE = 'cdc-v4';

const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/config.js',
  '/js/dashboard.js',
  '/js/finanzas_data.js',
  '/js/sheets.js',
  '/js/utils/store.js',
  '/js/utils/fmt.js',
  '/js/data/supabase-sync.js',
  '/js/data/oposiciones-seed.js',
  '/js/modules/agenda.js',
  '/js/modules/carnet.js',
  '/js/modules/excel.js',
  '/js/modules/finanzas.js',
  '/js/modules/it-txartelas.js',
  '/js/modules/oposiciones.js',
  '/js/modules/piso.js',
  '/js/modules/tareas.js',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
];

// Pre-cache app shell on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Remove old caches on activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for navigation, cache-first for assets
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // External CDN requests: network only (no cache pollution)
  if (!e.request.url.startsWith(self.location.origin)) return;

  // Navigation (HTML): network first, fall back to cached index
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => { updateCache(e.request, res.clone()); return res; })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: network first, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then(res => { updateCache(e.request, res.clone()); return res; })
      .catch(() => caches.match(e.request))
  );
});

function updateCache(req, res) {
  if (res.ok) caches.open(CACHE).then(c => c.put(req, res));
}
