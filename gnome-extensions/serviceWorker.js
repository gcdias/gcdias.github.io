const cacheName = 'gnome-extensions-static-v1';
const appPath = '/gnome-extensions';
const assets = [
  `${appPath}/`,
  `${appPath}/index.html`,
  `${appPath}/style.css`,
  `${appPath}/main.js`,
  `${appPath}/site.webmanifest`,
  `${appPath}/icon.svg`,
  `${appPath}/gnome-menu/builtInActions.js`,
  `${appPath}/gnome-menu/extension.js`,
  `${appPath}/gnome-menu/metadata.json`,
  `${appPath}/gnome-menu/menu.json`,
  `${appPath}/gnome-menu/menuConfig.js`,
  `${appPath}/gnome-menu/prefs.js`,
  `${appPath}/gnome-menu/wpaConfig.js`,
  `${appPath}/gnome-menu/schemas/org.gnome.shell.extensions.gnome-menu.gschema.xml`,
  `${appPath}/gnome-tint/extension.js`,
  `${appPath}/gnome-tint/metadata.json`,
  `${appPath}/gnome-tint/prefs.js`,
  `${appPath}/gnome-tint/res/gnome-tint-color-symbolic.svg`,
  `${appPath}/gnome-tint/res/stylesheet.src`,
  `${appPath}/gnome-tint/res/gtk.css`,
  `${appPath}/gnome-tint/res/ptyxis.palette`,
  `${appPath}/gnome-tint/res/user.src`,
  `${appPath}/gnome-tint/utils/logger.js`,
  `${appPath}/gnome-tint/utils/utils.js`,
  `${appPath}/gnome-tint/wp/wp-engine.js`,
  `${appPath}/gnome-tint/wp/bing.js`,
  `${appPath}/gnome-tint/wp/picsum.js`,
  `${appPath}/gnome-tint/wp/wiki.js`,
  `${appPath}/gnome-tint/wp/nasa.js`,
  `${appPath}/gnome-tint/wp/wall.js`,
  `${appPath}/gnome-tint/schemas/org.gnome.shell.extensions.gnome-tint.gschema.xml`
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
        .filter(key => key.startsWith('gnome-extensions-static-') && key !== cacheName)
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
