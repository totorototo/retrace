import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import useStore from "./store/store.js";
import ThemedApp from "./ThemedApp.jsx";

// why: started here, not in an effect: StrictMode runs effects twice in development, and
// that would fetch and analyse the race twice.
useStore.getState().loadDemo();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemedApp />
  </StrictMode>,
);
