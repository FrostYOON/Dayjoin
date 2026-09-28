import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import "./index.css";
import { AuthRoot } from "./features/auth/AuthRoot.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      storageKey="dayjoin-theme"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      // Vite uses client rendering; the provider effect initializes the theme.
      // Keep the library's SSR bootstrap script inert in this client-only app.
      scriptProps={{ type: "text/plain" }}
    >
      <AuthRoot />
    </ThemeProvider>
  </StrictMode>,
);
