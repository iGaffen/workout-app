/**
 * Renders an exercise's 3D mannequin into a loop of images for the Android workout widget
 * (docs/android-app.md). Two uses:
 *  - build time (scripts/widget-frames.mjs): smooth 30 fps loops bundled in the APK for the built-in exercises;
 *  - run time (bridge.ts): a lighter flipbook for any exercise without a bundled loop.
 */
import type { Exercise } from "../model/schema";
import { cycleLength, sample, timeline } from "../anim/solver";

export const FRAME_COUNT = 48; // runtime flipbook, about 15 per second

export interface Loop { frames: string[]; durations: number[] }

/**
 * One full movement cycle at `fps`, as opaque images with the stage glow baked in.
 * Identical consecutive frames (holds) are merged into one longer frame.
 */
export async function renderLoop(ex: Exercise, opts: { fps?: number; count?: number; w: number; h: number; quality: number }): Promise<Loop> {
  const { createStage } = await import("../anim/three/scene");
  const { w, h } = opts;
  const canvas = document.createElement("canvas");
  const stage = createStage(canvas, ex.animation, ex.id);
  try {
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    stage.resize(w / pr, h / pr);
    const segs = timeline(ex.animation);
    const total = cycleLength(segs);
    const n = opts.count ?? Math.max(8, Math.round((total / 1000) * (opts.fps ?? 30)));
    const step = total / n;
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    const g = out.getContext("2d")!;
    const glow = g.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, w * 0.6);
    glow.addColorStop(0, "#2A1F45"); glow.addColorStop(1, "#07060A");
    const frames: string[] = [];
    const durations: number[] = [];
    let last = "";
    for (let i = 0; i < n; i++) {
      stage.setSkeleton(sample(ex.animation, segs, i * step).skel);
      stage.render();
      g.fillStyle = glow; g.fillRect(0, 0, w, h);
      g.drawImage(canvas, 0, 0, w, h); // same task as render, so the drawing buffer is intact
      const url = out.toDataURL("image/webp", opts.quality);
      const ms = Math.round((i + 1) * step) - Math.round(i * step);
      if (url === last && !opts.count) durations[durations.length - 1] += ms;
      else { frames.push(url); durations.push(ms); last = url; }
      await new Promise((r) => setTimeout(r, 0)); // keep the app responsive
    }
    return { frames, durations };
  } finally {
    stage.dispose();
    (canvas.getContext("webgl2") as WebGL2RenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

/** Runtime flipbook: a fixed number of evenly spaced frames. */
export async function renderFrames(ex: Exercise): Promise<{ frames: string[]; interval: number }> {
  const { frames, durations } = await renderLoop(ex, { count: FRAME_COUNT, w: 320, h: 240, quality: 0.85 });
  const total = durations.reduce((a, b) => a + b, 0);
  return { frames, interval: Math.max(60, Math.round(total / frames.length)) };
}
