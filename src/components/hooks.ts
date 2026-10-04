import { useEffect, useState, useCallback } from "react";
import { onChange } from "../db/repos";

export function useReducedMotion() {
  const q = typeof matchMedia !== "undefined" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  const [r, setR] = useState(!!q?.matches);
  useEffect(() => {
    if (!q) return;
    const f = () => setR(q.matches);
    q.addEventListener("change", f);
    return () => q.removeEventListener("change", f);
  }, [q]);
  return r;
}

/** Load data from repos and reload whenever anything changes. */
export function useData<T>(load: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [v, setV] = useState<T>();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);
  useEffect(() => {
    let live = true;
    const go = () => run().then((x) => live && setV(x));
    go();
    const off = onChange(go);
    return () => { live = false; off(); };
  }, [run]);
  return v;
}
