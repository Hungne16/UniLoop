import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { BackendProvider } from "./backend";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BackendProvider>
      <App />
    </BackendProvider>
  </StrictMode>,
);
