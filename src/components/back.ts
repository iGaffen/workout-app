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

/** Bring history in line with what is open. Called right after taps, so new entries count as user-made. */
function sync() {
  const want = 1 + handlers.size;
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
  window.addEventListener("popstate", () => {
    if (ignorePops > 0) { ignorePops--; return; }
    depth = Math.max(0, depth - 1);
    const h = topHandler(handlers);
    if (h) { h.fn(); return; }
    toast("Press back again to exit");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast(null), 3000);
  });
}
