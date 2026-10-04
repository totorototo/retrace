// Offline shell: precache the build (the worker chunk embeds the WASM module), so the race can
// be analysed with no network at all.
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";

// A new build takes over as soon as it is installed, and main.jsx reloads the page onto it
// (registerType "autoUpdate"). why: waiting, a new build would only start once every tab
// was closed; and taking over without the reload would leave the old page asking for chunks
// the new precache no longer holds. No clientsClaim: a first visit is controlled from its
// next load, which keeps the e2e page.route stubs in front of the demo fetches.
self.skipWaiting();

precacheAndRoute(self.__WB_MANIFEST);

// The demo race, cached on first use rather than precached, and fetched from the network
// first: Netlify revalidates it on every load, so an unchanged file costs a 304 and a
// re-scrubbed one arrives at once. The cache answers only offline.
// why: 14 MB would hold up the service worker's install on every new build; and cache-first
// would serve the first copy it ever kept, forever.
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.includes("/demo/"),
  async ({ request }) => {
    const cache = await caches.open("retrace-demo");
    try {
      const response = await fetch(request);
      // A revalidated file comes back the same: skip rewriting 11 MB when its ETag hasn't
      // moved.
      const etag = response.headers.get("etag");
      const kept = etag && (await cache.match(request))?.headers.get("etag");
      // Never a page in place of a file (a host's SPA fallback): it would be kept for good.
      const page = response.headers.get("content-type")?.includes("text/html");
      if (response.ok && !page && (!etag || kept !== etag)) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      throw error;
    }
  },
);
