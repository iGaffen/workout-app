/**
 * Renders each exercise's 3D mannequin into a short loop of images for the Android workout widget,
 * which plays them as a flipbook on the exercise card (docs/android-app.md).
 */
import type { Exercise } from "../model/schema";
import { cycleLength, sample, timeline } from "../anim/solver";

export const FRAME_COUNT = 48; // about 15 per second
const FW = 320, FH = 240; // pixels, 4:3 like the app's stage

export async function renderFrames(ex: Exercise): Promise<{ frames: string[]; interval: number }> {
  const { createStage } = await import("../anim/three/scene");
  const canvas = document.createElement("canvas");
  const stage = createStage(canvas, ex.animation, ex.id);
  try {
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    stage.resize(FW / pr, FH / pr);
    const segs = timeline(ex.animation);
    const total = cycleLength(segs);
    // Opaque frames (the widget stores them as 16-bit images): the stage glow is baked in behind the figure.
    const out = document.createElement("canvas");
    out.width = FW; out.height = FH;
    const g = out.getContext("2d")!;
    const glow = g.createRadialGradient(FW / 2, FH * 0.55, 0, FW / 2, FH * 0.55, FW * 0.6);
    glow.addColorStop(0, "#2A1F45"); glow.addColorStop(1, "#07060A");
    const frames: string[] = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      stage.setSkeleton(sample(ex.animation, segs, (i * total) / FRAME_COUNT).skel);
      stage.render();
      g.fillStyle = glow; g.fillRect(0, 0, FW, FH);
      g.drawImage(canvas, 0, 0, FW, FH); // same task as render, so the drawing buffer is intact
      frames.push(out.toDataURL("image/webp", 0.85));
      await new Promise((r) => setTimeout(r, 0)); // keep the app responsive
    }
    return { frames, interval: Math.max(60, Math.round(total / FRAME_COUNT)) };
  } finally {
    stage.dispose();
    (canvas.getContext("webgl2") as WebGL2RenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
