const staticApp = "home-static-v2"
const assetsApp = [
  "/home/",
  "/home/index.html",
  "/home/style.css",
  "/home/main.js",
  "/home/data.js",
  "/home/extra.js",
  "/home/site.webmanifest",
  "/home/icon.svg",
  "/common/glcanvas.js"
]

self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open(staticApp)
      .then(cache => cache.addAll(assetsApp))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", activateEvent => {
  activateEvent.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith("home-static-") && key !== staticApp)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", fetchEvent => {
  const request = fetchEvent.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  fetchEvent.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(staticApp).then(cache => cache.put(request, copy))
        }
        return response
      })
    })
  )
})
