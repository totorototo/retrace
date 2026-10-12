// Offline shell: precache the build (the worker chunk embeds the WASM module), so a race can
// be analysed with no network at all. Files the user opens never leave the device.
import { precacheAndRoute } from "workbox-precaching";

// A new build takes over as soon as it is installed, and main.jsx reloads the page onto it
// (registerType "autoUpdate"). why: waiting, a new build would only start once every tab
// was closed; and taking over without the reload would leave the old page asking for chunks
// the new precache no longer holds.
self.skipWaiting();

precacheAndRoute(self.__WB_MANIFEST);
