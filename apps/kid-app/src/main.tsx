import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StoryViewer } from "./StoryViewer";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoryViewer />
  </StrictMode>,
);
