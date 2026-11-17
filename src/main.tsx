import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/michroma/400.css";
import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/figure.css";
import { App } from "./App";
import { init } from "./db/repos";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });
init();
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
