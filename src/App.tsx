import { useCallback, useEffect, useState } from "react";
import { Today } from "./screens/Today";
import { Routines } from "./screens/Routines";
import { Library } from "./screens/Library";
import { Settings } from "./screens/Settings";
import { Icon } from "./components/Icons";
import { TimerProvider, useTimer } from "./components/Timer";
import { useData } from "./components/hooks";
import { SettingsRepo } from "./db/repos";

const TABS = [
  { id: "today", label: "Today", icon: Icon.today },
  { id: "routines", label: "Routines", icon: Icon.routines },
  { id: "library", label: "Library", icon: Icon.library },
  { id: "settings", label: "Settings", icon: Icon.settings },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Shell() {
  const [tab, setTab] = useState<Tab>("today");
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
        <div hidden={tab !== "today"}><Today onRunning={onRunning} /></div>
        {tab === "routines" && <Routines />}
        {tab === "library" && <Library />}
        {tab === "settings" && <Settings />}
      </main>
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
