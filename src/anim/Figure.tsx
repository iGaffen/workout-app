import { useEffect, useMemo, useRef, useState } from "react";
import type { AnimationSpec } from "../model/schema";
import { endPoses, sample, solve, timeline } from "./solver";
import { scene } from "./draw";
import { subscribe } from "./loop";
import { useReducedMotion } from "../components/hooks";

interface Props { spec: AnimationSpec; name: string; controls?: boolean }

export function Figure({ spec, name, controls = true }: Props) {
  const g = useRef<SVGGElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [slow, setSlow] = useState(false);
  const segs = useMemo(() => timeline(spec), [spec]);
  const [startPose, endPose] = useMemo(() => endPoses(spec), [spec]);
  const state = useRef({ t: 0, last: 0, visible: true, paused: false, slow: false });
  state.current.paused = paused;
  state.current.slow = slow;

  useEffect(() => {
    if (reduce) return;
    const el = box.current;
    const io = new IntersectionObserver(([e]) => { state.current.visible = e.isIntersecting; });
    if (el) io.observe(el);
    let lastLabel = "";
    const draw = () => {
      const { skel, label: lb } = sample(spec, segs, state.current.t);
      if (g.current) g.current.innerHTML = scene(skel, spec.equipment);
      if (label.current && !state.current.paused && lb !== lastLabel) { label.current.textContent = lb; lastLabel = lb; }
    };
    draw();
    const unsub = subscribe((now) => {
      const s = state.current;
      const dt = s.last ? Math.min(now - s.last, 100) : 0;
      s.last = now;
      if (!s.visible || s.paused || document.hidden) return;
      s.t += dt * (s.slow ? 0.5 : 1);
      draw();
    });
    return () => { unsub(); io.disconnect(); };
  }, [spec, segs, reduce]);

  const still = (pose: typeof startPose) => scene(solve(pose), spec.equipment);
  // START / END pills freeze the figure on that end position; tap the figure to go back to moving.
  const [frozen, setFrozen] = useState<"start" | "end" | null>(null);
  state.current.paused = paused || frozen !== null;
  const view = reduce ? (frozen ?? "start") : frozen;

  return (
    <div className="animframe" ref={box}>
      <div className="framehead">
        <span className="phase" ref={label} aria-hidden="true">{view === "start" ? "Start" : view === "end" ? "End" : ""}</span>
        {controls && !reduce && (
          <button className="pill" onClick={() => setSlow((x) => !x)} aria-pressed={slow} aria-label="Half speed">{slow ? "0.5×" : "1×"}</button>
        )}
      </div>
      <button className="figbtn" onClick={() => { if (frozen) setFrozen(null); else setPaused((p) => !p); }}
        aria-label={paused || frozen ? `Play ${name} animation` : `Pause ${name} animation`}>
        {view
          ? <svg className="fig" viewBox="0 0 240 170" role="img" aria-label={`${name}: ${view} position`} dangerouslySetInnerHTML={{ __html: still(view === "start" ? startPose : endPose) }} />
          : <svg className="fig" viewBox="0 0 240 170" role="img" aria-label={`${name} movement animation`}><g ref={g} /></svg>}
      </button>
      {controls && (
        <div className="framefoot">
          <span className="tap">{reduce ? "Still frames" : paused || frozen ? "Tap to play" : "Tap to pause"}</span>
          <span style={{ display: "flex", gap: 6 }}>
            <button className="pill pill-sm" aria-pressed={view === "start"} onClick={() => setFrozen((f) => (f === "start" && !reduce ? null : "start"))}>Start</button>
            <button className="pill pill-sm" aria-pressed={view === "end"} onClick={() => setFrozen((f) => (f === "end" && !reduce ? null : "end"))}>End</button>
          </span>
        </div>
      )}
    </div>
  );
}
