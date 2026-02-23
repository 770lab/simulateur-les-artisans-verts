// ============================================
// SERVICE WORKER — Simulateur PAC PWA
// Les Artisans Verts © 2026
// ============================================

const CACHE_NAME = 'pac-sim-v3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './security.js',
  './auth.js',
  './app.js',
  './script-telepro.js',
  './icon-192.png',
  './icon-512.png'
];

// Install — cache les fichiers
self.addEventListener('install', function(event) {
  self.skipWaiting(); // Force activation immédiate
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate — nettoie les anciens caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() {
      return self.clients.claim(); // Prend le contrôle immédiatement
    })
  );
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Met à jour le cache
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(function() {
        return caches.match(event.request);
      })
  );
});

// Push notifications
self.addEventListener('push', function(event) {
  var data = { title: 'Les Artisans Verts', body: 'Nouvelle notification', icon: './icon-192.png' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data.body = event.data.text();
    }
  }

  var options = {
    body: data.body || '',
    icon: data.icon || './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'lav-notif',
    data: { url: data.url || './index.html' },
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Les Artisans Verts', options)
  );
});

// Clic sur notification → ouvre l'appli
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = event.notification.data.url || './index.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // Si déjà ouvert, focus
      for (var i = 0; i < windowClients.length; i++) {
        if (windowClients[i].url.indexOf('index.html') !== -1) {
          return windowClients[i].focus();
        }
      }
      // Sinon ouvre un nouvel onglet
      return clients.openWindow(url);
    })
  );
});
