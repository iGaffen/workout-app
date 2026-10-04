import { useEffect, useMemo, useRef, useState } from "react";
import type { AnimationSpec } from "../model/schema";
import { endPoses, sample, solve, timeline } from "./solver";
import { scene } from "./draw";
import { subscribe } from "./loop";
import { useReducedMotion } from "../components/hooks";

interface Props { spec: AnimationSpec; name: string; controls?: boolean; large?: boolean }

export function Figure({ spec, name, controls = true, large = false }: Props) {
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
      if (label.current && lb !== lastLabel) { label.current.textContent = lb; lastLabel = lb; }
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

  if (reduce) {
    return (
      <div className={`figure ${large ? "large" : ""}`}>
        <div className="strip only">
          <figure><svg className="fig" viewBox="0 0 240 170" role="img" aria-label={`${name}: start position`} dangerouslySetInnerHTML={{ __html: still(startPose) }} /><figcaption>Start</figcaption></figure>
          <figure><svg className="fig" viewBox="0 0 240 170" role="img" aria-label={`${name}: end position`} dangerouslySetInnerHTML={{ __html: still(endPose) }} /><figcaption>End</figcaption></figure>
        </div>
      </div>
    );
  }

  return (
    <div className={`figure ${large ? "large" : ""}`} ref={box}>
      <button className="figbtn" onClick={() => setPaused((p) => !p)} aria-label={paused ? `Play ${name} animation` : `Pause ${name} animation`}>
        <svg className="fig" viewBox="0 0 240 170" role="img" aria-label={`${name} movement animation`}><g ref={g} /></svg>
        {paused && <span className="pausebadge" aria-hidden="true">Paused</span>}
      </button>
      <div className="figbar">
        <span className="phase" ref={label} aria-hidden="true" />
        {controls && (
          <button className="chipbtn" onClick={() => setSlow((s) => !s)} aria-pressed={slow} aria-label="Half speed">
            {slow ? "0.5x" : "1x"}
          </button>
        )}
      </div>
      {controls && large && (
        <div className="strip">
          <figure><svg className="fig" viewBox="0 0 240 170" role="img" aria-label={`${name}: start position`} dangerouslySetInnerHTML={{ __html: still(startPose) }} /><figcaption>Start</figcaption></figure>
          <figure><svg className="fig" viewBox="0 0 240 170" role="img" aria-label={`${name}: end position`} dangerouslySetInnerHTML={{ __html: still(endPose) }} /><figcaption>End</figcaption></figure>
        </div>
      )}
    </div>
  );
}
