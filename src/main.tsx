import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./styles/app.css";
import "./styles/figure.css";
import { App } from "./App";
import { init } from "./db/repos";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });
init();
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
