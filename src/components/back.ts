import { useEffect, useRef } from "react";

/**
 * Android back button. We keep one extra "guard" history entry; every back press lands in popstate,
 * where the topmost open thing closes (pop-up > screen > tab), and only at the root does back leave the app.
 * Levels: 0 = tab history, 1 = screens (detail, editor, workout), 2 = pop-ups.
 */
interface H { level: number; seq: number; fn: () => void }
const handlers = new Set<H>();
let seq = 0;
let armedUntil = 0;
let toast: (msg: string | null) => void = () => {};
let installed = false;

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

/** Pick the handler to run: highest level, most recently opened within it. */
export function topHandler(list: Iterable<H>): H | undefined {
  let best: H | undefined;
  for (const h of list) if (!best || h.level > best.level || (h.level === best.level && h.seq > best.seq)) best = h;
  return best;
}

export function initBack(showToast: (msg: string | null) => void) {
  toast = showToast;
  if (installed) return;
  installed = true;
  if (!history.state?.guard) {
    history.replaceState({ root: true }, "");
    history.pushState({ guard: true }, "");
  }
  window.addEventListener("popstate", () => {
    const h = topHandler(handlers);
    if (h) { h.fn(); history.pushState({ guard: true }, ""); return; }
    if (Date.now() < armedUntil) { toast(null); history.back(); return; }
    armedUntil = Date.now() + 2000;
    toast("Press back again to exit");
    setTimeout(() => toast(null), 2000);
    history.pushState({ guard: true }, "");
  });
}
