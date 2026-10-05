import { useEffect, useRef } from "react";

/**
 * Android back button.
 * Chrome skips history entries that a page adds without a tap, so entries are only added right after a tap:
 * we keep (1 + number of open things) entries above the start. Each back press pops one entry and closes
 * the topmost open thing (pop-up > screen > tab). With nothing open, back shows "Press back again to exit"
 * and the next back leaves the app.
 * Levels: 0 = tabs, 1 = screens (detail, editor, workout), 2-3 = pop-ups.
 * Every handler must close what registered it, so the entry count stays in step.
 */
export interface H { level: number; seq: number; fn: () => void }
const handlers = new Set<H>();
let seq = 0;
let depth = 0;
let ignorePops = 0;
let toast: (msg: string | null) => void = () => {};
let toastTimer = 0;
let installed = false;

export function topHandler(list: Iterable<H>): H | undefined {
  let best: H | undefined;
  for (const h of list) if (!best || h.level > best.level || (h.level === best.level && h.seq > best.seq)) best = h;
  return best;
}

/**
 * Two ways to catch the back button:
 * - CloseWatcher (Chrome 120+, Android): made for exactly this. One watcher per open thing plus one
 *   "exit guard" on Home. The first watcher needs no tap, so back works even right after opening the app.
 * - Fallback: history entries, added only right after taps (Chrome skips entries added without one).
 */
interface CW { destroy(): void; onclose: (() => void) | null }
const CloseWatcherCtor = (globalThis as unknown as { CloseWatcher?: new () => CW }).CloseWatcher;
const watchers: CW[] = [];

function onBack() {
  const h = topHandler(handlers);
  if (h) { h.fn(); return; }
  toast("Press back again to exit");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast(null), 3000);
}

/** Bring watchers (or history entries) in line with what is open. Called right after taps. */
function sync() {
  const want = 1 + handlers.size;
  if (CloseWatcherCtor) {
    while (watchers.length < want) {
      const w = new CloseWatcherCtor();
      w.onclose = () => { const i = watchers.indexOf(w); if (i >= 0) watchers.splice(i, 1); onBack(); };
      watchers.push(w);
    }
    while (watchers.length > want) watchers.pop()!.destroy();
    return;
  }
  while (depth < want) { history.pushState({ gym: ++depth }, ""); }
  if (depth > want) {
    // Something was closed with an on-screen button: drop the extra entries quietly.
    const n = depth - want;
    depth = want;
    ignorePops++;
    history.go(-n);
  }
}
const syncSoon = () => setTimeout(sync, 60);

export function useBackHandler(active: boolean, fn: () => void, level: number) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const h: H = { level, seq: ++seq, fn: () => ref.current() };
    handlers.add(h);
    return () => { handlers.delete(h); };
  }, [active, level]);
}

export function initBack(showToast: (msg: string | null) => void) {
  toast = showToast;
  if (installed) return;
  installed = true;
  // Any tap: sync after the app has reacted to it (still within the tap's user activation).
  window.addEventListener("click", syncSoon, true);
  if (CloseWatcherCtor) { sync(); return; } // the first watcher is allowed without a tap
  window.addEventListener("popstate", () => {
    if (ignorePops > 0) { ignorePops--; return; }
    depth = Math.max(0, depth - 1);
    onBack();
  });
}
