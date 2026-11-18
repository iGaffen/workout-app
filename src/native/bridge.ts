/**
 * Keeps the Android widgets and the app in step (docs/android-app.md):
 * pushes a fresh widget snapshot after every change, and on open/resume applies the actions
 * taken in widgets while the app was closed.
 */
import { registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BodyRepo, ExerciseRepo, LogRepo, RoutineRepo, SettingsRepo, onChange } from "../db/repos";
import { DAY_EXTERNAL, DAY_SAVED, finishDay, freshDay, loadDay, saveDay, type DayState } from "../model/day";
import type { Exercise } from "../model/schema";
import { buildWidgetState } from "./widgetState";

export type WidgetEvent =
  | { type: "toggle"; key: string; done: boolean; at: number }
  | { type: "weight"; id: string; value: number; at: number }
  | { type: "choose"; key: string; id: string; at: number }
  | { type: "finish"; at: number }
  | { type: "body"; date: string; w?: number; c?: number; at: number };

interface WidgetBridgePlugin {
  pushState(o: { state: string }): Promise<void>;
  takeEvents(): Promise<{ events: string }>;
  saveFrames(o: { id: string; interval: number; frames: string[] }): Promise<void>;
  listFrames(o: { ids: string[] }): Promise<{ ids: string[] }>;
}
const Bridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");

/** Apply widget events in order to today's state and the stored data. Exported for tests. */
export async function applyEvents(events: WidgetEvent[]): Promise<void> {
  let day: DayState = loadDay();
  for (const e of events) {
    switch (e.type) {
      case "toggle":
        day = { ...day, done: e.done ? [...new Set([...day.done, e.key])] : day.done.filter((k) => k !== e.key), startedAt: day.startedAt ?? (e.done ? e.at : undefined) };
        break;
      case "weight": day = { ...day, weights: { ...day.weights, [e.id]: e.value } }; break;
      case "choose": day = { ...day, choice: { ...(day.choice ?? {}), [e.key]: e.id } }; break;
      case "finish": {
        const settings = await SettingsRepo.get();
        const routines = await RoutineRepo.all();
        const routine = routines.find((r) => r.id === settings.activeRoutineId) ?? routines[0];
        if (routine && day.done.length) {
          const exMap = new Map<string, Exercise>((await ExerciseRepo.all(true)).map((x) => [x.id, x]));
          await finishDay(day, { routine, settings, exMap, logs: await LogRepo.all() }, e.at);
        }
        day = freshDay();
        break;
      }
      case "body": await BodyRepo.put(e.date, { ...(e.w !== undefined ? { weightKg: e.w } : {}), ...(e.c !== undefined ? { waistCm: e.c } : {}) }); break;
    }
  }
  saveDay(day);
  window.dispatchEvent(new Event(DAY_EXTERNAL));
}

let timer = 0;
async function push() {
  const state = await buildWidgetState();
  if (state) await Bridge.pushState({ state: JSON.stringify(state) }).catch(() => {});
}
const pushSoon = () => { clearTimeout(timer); timer = window.setTimeout(push, 400); };

async function sync() {
  try {
    const { events } = await Bridge.takeEvents();
    const list = JSON.parse(events || "[]") as WidgetEvent[];
    if (list.length) await applyEvents(list);
  } catch { /* plugin missing: nothing to apply */ }
  await push();
  framesSoon();
}

/** Make sure every exercise in today's plan has its widget animation; renders missing ones in the background. */
let framesBusy = false;
async function ensureFrames() {
  if (framesBusy) return;
  framesBusy = true;
  try {
    const state = await buildWidgetState();
    if (!state) return;
    const all = [...new Set(state.workout.items.flatMap((i) => [i.id, ...i.options.map((o) => o.id)]))];
    const { ids } = await Bridge.listFrames({ ids: all }); // includes exercises with a loop bundled in the app
    const want = all.filter((id) => !ids.includes(id));
    if (!want.length) return;
    const { renderFrames } = await import("./frames");
    const exMap = new Map<string, Exercise>((await ExerciseRepo.all(true)).map((x) => [x.id, x]));
    for (const id of want) {
      const ex = exMap.get(id);
      if (!ex || document.hidden) continue;
      const { frames, interval } = await renderFrames(ex);
      await Bridge.saveFrames({ id, interval, frames });
    }
  } catch { /* no WebGL or plugin: the card shows without animation */ }
  finally { framesBusy = false; }
}
const framesSoon = () => window.setTimeout(ensureFrames, 1500);

export function startWidgetBridge() {
  sync();
  onChange(pushSoon);
  window.addEventListener(DAY_SAVED, pushSoon);
  App.addListener("appStateChange", ({ isActive }) => { if (isActive) sync(); else push(); });
}
