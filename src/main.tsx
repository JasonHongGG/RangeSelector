import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { GlobalOverlay } from "./components/overlays/GlobalOverlay";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
    <GlobalOverlay />
  </React.StrictMode>
);
