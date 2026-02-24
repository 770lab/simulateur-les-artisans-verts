// Chab'app Service Worker v2 - Version sûre (pas d'écran blanc)
const CACHE_NAME = 'chabapp-v2';

// Installation : on ne pré-cache RIEN pour éviter les écrans blancs
self.addEventListener('install', (event) => {
  console.log('[SW] Installation v2...');
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation v2...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch : TOUJOURS réseau d'abord, cache en dernier recours
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache seulement les réponses valides
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Réseau indisponible → essayer le cache
        return caches.match(event.request);
      })
  );
});
