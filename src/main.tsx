import React from "react";
import { MotionConfig } from "motion/react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "./lib/store";
import App from "./App";
import "./styles.css";
import "./liquid.css";
import "./motion.css";
import "./participation.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider>
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>,
);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
