// Kill-switch service worker. The app no longer uses a service worker (see
// src/components/pwa/register-sw.tsx), but browsers that installed the old
// one keep it active until it is replaced — and per the SW spec, browsers
// only ever check this file over plain HTTP, bypassing any old worker's
// fetch handler, so this update always reaches them even if the old worker
// is currently breaking every navigation it intercepts. Installing this
// version wipes the old worker's caches, unregisters it, and reloads any
// open tab it was controlling so the app is served straight from the
// network from then on.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clientsList = await self.clients.matchAll({ type: "window" });
      for (const client of clientsList) {
        client.navigate(client.url);
      }
    })()
  );
});
