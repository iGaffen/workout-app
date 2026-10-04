/** One shared requestAnimationFrame loop for every animation on screen. */
type Fn = (now: number) => void;
const subs = new Set<Fn>();
let raf = 0;

function tick(now: number) {
  subs.forEach((fn) => fn(now));
  raf = subs.size ? requestAnimationFrame(tick) : 0;
}

export function subscribe(fn: Fn): () => void {
  subs.add(fn);
  if (!raf) raf = requestAnimationFrame(tick);
  return () => { subs.delete(fn); };
}
