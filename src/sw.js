// Offline shell: precache the build (the worker chunk embeds the WASM module), so a race can
// be analysed with no network at all. Files the user opens never leave the device.
import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);
