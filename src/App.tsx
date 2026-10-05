import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Today } from "./screens/Today";
const Routines = lazy(() => import("./screens/Routines").then((m) => ({ default: m.Routines })));
const Library = lazy(() => import("./screens/Library").then((m) => ({ default: m.Library })));
const Settings = lazy(() => import("./screens/Settings").then((m) => ({ default: m.Settings })));
const Progress = lazy(() => import("./screens/Progress").then((m) => ({ default: m.Progress })));
import { Icon } from "./components/Icons";
import { TimerProvider, useTimer } from "./components/Timer";
import { useData } from "./components/hooks";
import { SettingsRepo } from "./db/repos";
import { initBack, useBackHandler } from "./components/back";

const TABS = [
  { id: "today", label: "Today", icon: Icon.today },
  { id: "routines", label: "Routines", icon: Icon.routines },
  { id: "library", label: "Library", icon: Icon.library },
  { id: "progress", label: "Progress", icon: Icon.progress },
  { id: "settings", label: "Settings", icon: Icon.settings },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Shell() {
  const [tab, setTabRaw] = useState<Tab>("today");
  const [tabHistory, setTabHistory] = useState<Tab[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const setTab = (t: Tab) => { if (t !== tab) { setTabHistory((h) => [...h.filter((x) => x !== t), tab]); setTabRaw(t); } };
  useEffect(() => initBack(setToast), []);
  useBackHandler(tabHistory.length > 0, () => {
    const prev = tabHistory[tabHistory.length - 1];
    setTabHistory(tabHistory.slice(0, -1));
    if (prev) setTabRaw(prev);
    scrollTo(0, 0);
  }, 0);
  const [running, setRunning] = useState(false);
  const settings = useData(() => SettingsRepo.get());
  const timer = useTimer();
  const onRunning = useCallback((r: boolean) => setRunning(r), []);

  useEffect(() => {
    const t = settings?.theme ?? "system";
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }, [settings?.theme]);

  return (
    <div className={`app ${timer.on ? "timer-on" : ""}`}>
      <main className="wrap">
        {/* Today stays mounted so a workout in progress survives switching tabs. */}
        <div hidden={tab !== "today"}><Today onRunning={onRunning} visible={tab === "today"} /></div>
        <Suspense fallback={<p className="sub">Loading…</p>}>
        {tab === "routines" && <Routines />}
        {tab === "library" && <Library />}
        {tab === "progress" && <Progress />}
        {tab === "settings" && <Settings />}
        </Suspense>
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
      <nav className="tabs" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id ? "page" : undefined} onClick={() => { setTab(t.id); scrollTo(0, 0); }}>
            <t.icon /><span>{t.label}{t.id === "today" && running && tab !== "today" ? " •" : ""}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export function App() {
  return <TimerProvider><Shell /></TimerProvider>;
}
