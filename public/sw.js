/**
 * Zana AI — Service Worker v1.0
 * Caches static assets for offline shell.
 */

const CACHE_NAME = 'zana-ai-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/auth.html',
  '/chat.html',
  '/css/main.css',
  '/css/chat.css',
  '/css/auth.css',
  '/css/landing.css',
  '/js/app.js',
  '/js/chat.js',
  '/js/auth.js',
  '/js/sidebar.js',
  '/js/settings.js',
  '/js/voice.js',
  '/js/export.js',
  '/js/landing.js',
  '/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response(
      JSON.stringify({ error: 'Offline — please check your connection.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
