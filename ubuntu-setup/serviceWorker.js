const cacheName = 'ubuntu-setup-static-v1';
const appPath = '/ubuntu-setup';
const assets = [
  `${appPath}/`,
  `${appPath}/index.html`,
  `${appPath}/main.js`,
  `${appPath}/style.css`,
  `${appPath}/res/html/style.css`,
  `${appPath}/init.sh`,
  `${appPath}/site.webmanifest`,
  `${appPath}/icon.svg`,
  `${appPath}/sw/index.html`,
  `${appPath}/sw/style.css`,
  `${appPath}/sw/main.js`,
  `${appPath}/sw/setup.json`,
  `${appPath}/sw/pwa-edge.json`,
  `${appPath}/sw/icon.svg`,
  `${appPath}/sw/site.webmanifest`
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(assets))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key.startsWith('ubuntu-setup-static-') && key !== cacheName)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(cacheName).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
