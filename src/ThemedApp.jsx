import { useEffect } from "react";
import { ThemeProvider } from "styled-components";

import App from "./App.jsx";
import useStore from "./store/store.js";
import GlobalStyle from "./theme/GlobalStyle.js";
import THEME from "./theme/Theme.js";

// Same design system as Terminus (src/theme/Theme.js is copied from it), light or dark as
// the store says: the system's variant until the toggle picks one.
export default function ThemedApp() {
  const variant = useStore((state) => state.theme);
  const theme = { ...THEME, currentVariant: variant };

  // The browser chrome (address bar, PWA title bar) follows the page background.
  useEffect(() => {
    const background = THEME.colors[variant]["--color-background"];
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", background);
  }, [variant]);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <App />
    </ThemeProvider>
  );
}
