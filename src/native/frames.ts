/**
 * Renders each exercise's 3D mannequin into a short loop of images for the Android workout widget,
 * which plays them as a flipbook on the exercise card (docs/android-app.md).
 */
import type { Exercise } from "../model/schema";
import { cycleLength, sample, timeline } from "../anim/solver";

export const FRAME_COUNT = 24;
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
    const frames: string[] = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      stage.setSkeleton(sample(ex.animation, segs, (i * total) / FRAME_COUNT).skel);
      stage.render();
      frames.push(canvas.toDataURL("image/webp", 0.9)); // same task as render, so the drawing buffer is intact
      await new Promise((r) => setTimeout(r, 0)); // keep the app responsive
    }
    return { frames, interval: Math.max(60, Math.round(total / FRAME_COUNT)) };
  } finally {
    stage.dispose();
    (canvas.getContext("webgl2") as WebGL2RenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
