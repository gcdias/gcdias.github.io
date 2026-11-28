const cacheName = "audio-rec-static-v5";
const appPath = "/audio-rec";
const assets = [
    `${appPath}/`,
    `${appPath}/index.html`,
    `${appPath}/style.css`,
    `${appPath}/main.js`,
    `${appPath}/site.webmanifest`,
    `${appPath}/icon.svg`
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(cacheName)
            .then(cache => cache.addAll(assets))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key.startsWith("audio-rec-static-") && key !== cacheName)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(`${appPath}/`)) {
        return;
    }

    event.respondWith(
        caches.open(cacheName).then(async cache => {
            const cached = await cache.match(request);
            if (cached) return cached;

            const response = await fetch(request);
            if (response.ok) await cache.put(request, response.clone());
            return response;
        })
    );
});
