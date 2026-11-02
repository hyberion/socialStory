import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Unlock } from "./Unlock";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Unlock>
      <App />
    </Unlock>
  </StrictMode>,
);
