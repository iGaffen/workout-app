import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface Ctx { start: (sec: number, label: string) => void; stop: () => void; on: boolean }
const TimerCtx = createContext<Ctx>({ start: () => {}, stop: () => {}, on: false });
export const useTimer = () => useContext(TimerCtx);

const fmt = (s: number) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

let audio: AudioContext | null = null;
function beep() {
  try {
    audio = audio ?? new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain();
    o.connect(g); g.connect(audio.destination); o.frequency.value = 880; g.gain.value = 0.25;
    o.start(); o.stop(audio.currentTime + 0.35);
  } catch { /* no audio */ }
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* no vibration */ }
}

/** Rest timer bar. Time is computed from an end timestamp, so it stays right after the screen locks. */
export function TimerProvider({ children }: { children: ReactNode }) {
  const [end, setEnd] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [, force] = useState(0);
  const beeped = useRef(false);

  const start = useCallback((sec: number, l: string) => {
    try { audio = audio ?? new AudioContext(); audio.resume(); } catch { /* unlock audio on tap */ }
    beeped.current = false; setLabel(l); setEnd(Date.now() + sec * 1000);
  }, []);
  const stop = useCallback(() => setEnd(null), []);

  useEffect(() => {
    if (end === null) return;
    const id = setInterval(() => {
      force((x) => x + 1);
      const left = end - Date.now();
      if (left <= 0 && !beeped.current) { beeped.current = true; beep(); }
      if (left < -3000) setEnd(null);
    }, 250);
    return () => clearInterval(id);
  }, [end]);

  const left = end === null ? 0 : (end - Date.now()) / 1000;
  return (
    <TimerCtx.Provider value={{ start, stop, on: end !== null }}>
      {children}
      {end !== null && (
        <div className="timer" role="timer" aria-live="polite">
          <div className="big" aria-label={`${Math.max(0, Math.ceil(left))} seconds left`}>{fmt(left)}</div>
          <div className="lbl">{left <= 0 ? "Go!" : label}</div>
          <button onClick={() => setEnd((e) => (e ?? Date.now()) - 15000)} aria-label="Minus 15 seconds">−15</button>
          <button onClick={() => setEnd((e) => (e ?? Date.now()) + 15000)} aria-label="Plus 15 seconds">+15</button>
          <button onClick={stop}>Skip</button>
        </div>
      )}
    </TimerCtx.Provider>
  );
}

/** Keep the screen on while mounted. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const req = () => navigator.wakeLock.request("screen").then((l) => { lock = l; }).catch(() => {});
    req();
    const vis = () => { if (document.visibilityState === "visible") req(); };
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("visibilitychange", vis); lock?.release().catch(() => {}); };
  }, [active]);
}
