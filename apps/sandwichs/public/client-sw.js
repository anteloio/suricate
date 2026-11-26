// Service worker of the installable customer app, registered with scope / (the admin has its own,
// /admin-sw.js with scope /admin, which wins on admin pages). It caches nothing, orders must
// always be fresh: it is only there because some browsers still require one before "Install".
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
