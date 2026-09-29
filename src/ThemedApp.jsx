import { ThemeProvider } from "styled-components";

import App from "./App.jsx";
import GlobalStyle from "./theme/GlobalStyle.js";
import THEME from "./theme/Theme.js";

// Same design system as Terminus (src/theme/Theme.js is copied from it). Dark only for now.
const theme = { ...THEME, currentVariant: "dark" };

export default function ThemedApp() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <App />
    </ThemeProvider>
  );
}
