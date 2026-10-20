const cacheName = "cnote-static-v4";
const appPath = "/cnote";
const assets = [
  `${appPath}/`,
  `${appPath}/index.html`,
  `${appPath}/style.css?v=261020b`,
  `${appPath}/main.js?v=261020b`,
  `${appPath}/site.webmanifest`,
  `${appPath}/icon.svg`
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(assets))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key.startsWith("cnote-static-") && key !== cacheName)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
