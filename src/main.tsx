import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@shared/i18n/config";

import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
