import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { unlockAudio } from "./lib/sound";

// Browsers only start audio after a user gesture.
for (const event of ["pointerdown", "keydown"])
  window.addEventListener(event, unlockAudio, { passive: true });
ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
