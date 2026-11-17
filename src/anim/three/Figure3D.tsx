import { useEffect, useRef } from "react";
import type { AnimationSpec } from "../../model/schema";
import { endPoses, sample, solve, timeline } from "../solver";
import { subscribe } from "../loop";
import { createStage, type Stage } from "./scene";

interface Props {
  spec: AnimationSpec; exerciseId: string; name: string;
  paused: boolean; slow: boolean; frozen: "start" | "end" | null; still: boolean;
  onPhase: (label: string) => void; onTap: () => void;
}

/** Live 3D mannequin. Drag sideways to turn the view; a tap pauses; double-tap resets the angle. */
export default function Figure3D({ spec, exerciseId, name, paused, slow, frozen, still, onPhase, onTap }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<Stage | null>(null);
  const st = useRef({ t: 0, last: 0, visible: true, paused, slow, frozen, still, dirty: true, label: "" });
  Object.assign(st.current, { paused, slow, frozen, still, dirty: true });
  const phase = useRef(onPhase); phase.current = onPhase;

  useEffect(() => {
    const el = canvas.current!;
    const s = createStage(el, spec, exerciseId);
    stage.current = s;
    const segs = timeline(spec);
    const [startPose, endPose] = endPoses(spec);
    const fit = () => { const r = el.getBoundingClientRect(); if (r.width) { s.resize(r.width, r.height); st.current.dirty = true; } };
    const ro = new ResizeObserver(fit); ro.observe(el); fit();
    const io = new IntersectionObserver(([e]) => { st.current.visible = e.isIntersecting; }); io.observe(el);

    const draw = () => {
      const c = st.current;
      if (c.frozen || c.still) {
        s.setSkeleton(solve(c.frozen === "end" ? endPose : startPose));
      } else {
        const { skel, label } = sample(spec, segs, c.t);
        s.setSkeleton(skel);
        if (label !== c.label) { c.label = label; phase.current(label); }
      }
      s.render();
      c.dirty = false;
    };
    const unsub = subscribe((now) => {
      const c = st.current;
      const dt = c.last ? Math.min(now - c.last, 100) : 0;
      c.last = now;
      if (!c.visible || document.hidden) return;
      const moving = !c.paused && !c.frozen && !c.still;
      if (moving) c.t += dt * (c.slow ? 0.5 : 1);
      if (moving || c.dirty) draw();
    });
    return () => { unsub(); ro.disconnect(); io.disconnect(); s.dispose(); stage.current = null; };
  }, [spec, exerciseId]);

  // Drag to orbit; a short tap pauses; double-tap resets.
  const drag = useRef<{ x: number; moved: boolean; lastTap: number } | null>(null);
  const lastTap = useRef(0);
  return (
    <canvas
      ref={canvas}
      className="fig3d"
      role="img"
      aria-label={`${name}: 3D figure demonstrating the movement. Drag to turn the view, tap to pause.`}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, moved: false, lastTap: 0 }; }}
      onPointerMove={(e) => {
        const d = drag.current; if (!d) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 4 || d.moved) { d.moved = true; stage.current?.orbit(dx * 0.012); st.current.dirty = true; d.x = e.clientX; }
      }}
      onPointerUp={() => {
        const d = drag.current; drag.current = null;
        if (!d || d.moved) return;
        const now = Date.now();
        if (now - lastTap.current < 300) { stage.current?.resetView(); st.current.dirty = true; lastTap.current = 0; onTap(); return; } // undo the first tap's pause
        lastTap.current = now;
        onTap();
      }}
      onPointerCancel={() => { drag.current = null; }}
    />
  );
}
