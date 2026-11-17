// Service worker of the installable admin app, registered with scope /admin (so it has to sit at
// the root). It caches nothing, orders must always be fresh: it is only there because some
// browsers still require one before they offer "Install".
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
