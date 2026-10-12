import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import ThemedApp from "./ThemedApp.jsx";

// Registers the offline shell, and reloads the page when a new build's worker takes over
// (see sw.js).
registerSW({ immediate: true });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemedApp />
  </StrictMode>,
);
