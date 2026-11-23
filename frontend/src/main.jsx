// ============================================
// main.jsx — React entry point
// Mounts the App component into the DOM
// ============================================

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // Global styles + Tailwind
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);