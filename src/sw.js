// Offline shell: precache the build (the worker chunk embeds the WASM module), so the race can
// be analysed with no network at all.
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";

precacheAndRoute(self.__WB_MANIFEST);

// The demo race, cached on first use rather than precached.
// why: 17 MB would hold up the service worker's install on every new build, while the files
// themselves never change.
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.includes("/demo/"),
  async ({ request }) => {
    const cache = await caches.open("retrace-demo");
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  },
);
