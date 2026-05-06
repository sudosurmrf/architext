/**
 * @module @architext/web/main
 * Concepts: [[EntryPoint]], [[ReactRoot]]
 * Spec: §6.2 Web app stack — Vite + React 18
 * Depends on: [[App]]
 * Consumed by: index.html (script entry)
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
