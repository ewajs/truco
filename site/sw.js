// Service worker: permite instalar la app y usarla sin conexión.
//
// Estrategia "primero la red": con conexión siempre se sirve lo último publicado (y se
// guarda una copia); sin conexión se usa la última copia. No hay lista de archivos para
// mantener: se guarda lo que la app va pidiendo.

const CACHE = 'truco';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}
