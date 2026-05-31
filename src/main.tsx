import { StrictMode } from "react";
import { ApolloProvider } from "@apollo/client";
import { createRoot } from "react-dom/client";
import { AuthGuard } from "./components/auth-guard";
import { Shell } from "./shell";
import { ErrorBoundary } from "./components/error-boundary";
import { apolloClient } from "./lib/apollo";
import { logger } from "./lib/logger";
import "./styles.css";

window.addEventListener("error", (event) => {
  logger.error("Nem kezelt runtime hiba", {
    error: event.error,
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logger.error("Nem kezelt promise hiba", { error: event.reason });
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  logger.error("Root element hianyzik", { rootId: "root" });
  throw new Error("Root element not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthGuard>
        <ApolloProvider client={apolloClient}>
          <Shell />
        </ApolloProvider>
      </AuthGuard>
    </ErrorBoundary>
  </StrictMode>,
);
