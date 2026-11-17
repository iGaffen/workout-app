import { Suspense, lazy, useEffect, useState } from "react";
import { Home } from "./screens/Home";
const Routines = lazy(() => import("./screens/Routines").then((m) => ({ default: m.Routines })));
const Library = lazy(() => import("./screens/Library").then((m) => ({ default: m.Library })));
const Settings = lazy(() => import("./screens/Settings").then((m) => ({ default: m.Settings })));
const Progress = lazy(() => import("./screens/Progress").then((m) => ({ default: m.Progress })));
import { Glyph, brandUrl, type GlyphName } from "./components/Glyph";
import { TimerProvider } from "./components/Timer";
import { initBack, initNativeBack, useBackHandler } from "./components/back";
import { isNative } from "./native/platform";
import { App as CapApp } from "@capacitor/app";

const TABS: { id: string; label: string; icon: GlyphName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "routines", label: "Routines", icon: "routines" },
  { id: "library", label: "Library", icon: "library" },
  { id: "progress", label: "Progress", icon: "progress" },
  { id: "settings", label: "Settings", icon: "settings" },
];

/** Film grain: one fixed SVG layer behind the whole app (build pack §2.0). */
function Grain() {
  return (
    <svg className="grain" aria-hidden="true">
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" /></filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}

function Shell() {
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState<string | null>(null);
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    if (isNative()) initNativeBack(setToast, (fn) => { CapApp.addListener("backButton", fn); }, () => { CapApp.exitApp(); });
    else initBack(setToast);
  }, []);
  useEffect(() => { const t = setTimeout(() => setSplash(false), 1150); return () => clearTimeout(t); }, []);
  // Back from any other tab always lands on Home first.
  useBackHandler(tab !== "home", () => { setTab("home"); scrollTo(0, 0); }, 0);

  return (
    <>
      <Grain />
      <main className="screen">
        {/* Home stays mounted so today's ticks survive switching tabs. */}
        <div hidden={tab !== "home"} className={tab === "home" ? "screen-in" : ""}><Home /></div>
        <Suspense fallback={null}>
          <div key={tab} className="screen-in">
            {tab === "routines" && <Routines />}
            {tab === "library" && <Library />}
            {tab === "progress" && <Progress />}
            {tab === "settings" && <Settings />}
          </div>
        </Suspense>
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id ? "page" : undefined} onClick={() => { setTab(t.id); scrollTo(0, 0); }}>
            <span className="tabicon"><Glyph name={t.icon} active={tab === t.id} size={22} /></span>
            {t.label}
          </button>
        ))}
      </nav>
      {splash && <div className="splash" aria-hidden="true"><img src={brandUrl("splash-mark")} alt="" /></div>}
    </>
  );
}

export function App() {
  return <TimerProvider><Shell /></TimerProvider>;
}
