import "fake-indexeddb/auto";
import { beforeAll, describe, expect, it } from "vitest";

// Minimal browser globals for the day-state helpers (node test environment).
beforeAll(() => {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
  const et = new EventTarget();
  (globalThis as any).window = { dispatchEvent: (e: Event) => et.dispatchEvent(e), addEventListener: et.addEventListener.bind(et), removeEventListener: et.removeEventListener.bind(et) };
});

describe("widget events", () => {
  it("ticks, weights and a widget finish become a logged session; body entries go to Progress", async () => {
    const { applyEvents } = await import("../src/native/bridge");
    const { LogRepo, BodyRepo } = await import("../src/db/repos");
    const { loadDay } = await import("../src/model/day");
    const now = Date.now();
    await applyEvents([
      { type: "toggle", key: "lat-pulldown", done: true, at: now - 60_000 },
      { type: "weight", id: "lat-pulldown", value: 47.5, at: now - 50_000 },
      { type: "toggle", key: "goblet-squat", done: true, at: now - 40_000 },
      { type: "toggle", key: "goblet-squat", done: false, at: now - 30_000 },
      { type: "body", date: "2026-11-17", w: 82.4, c: 92.5, at: now },
    ]);
    const day = loadDay();
    expect(day.done).toEqual(["lat-pulldown"]);
    expect(day.weights["lat-pulldown"]).toBe(47.5);
    expect(day.startedAt).toBe(now - 60_000);
    expect((await BodyRepo.all()).find((b) => b.date === "2026-11-17")).toMatchObject({ weightKg: 82.4, waistCm: 92.5 });

    await applyEvents([{ type: "finish", at: now }]);
    const logs = await LogRepo.all();
    expect(logs).toHaveLength(1);
    expect(logs[0].sets!.every((s) => s.exerciseId === "lat-pulldown" && s.weightKg === 47.5)).toBe(true);
    expect(logs[0].durationSeconds).toBe(60);
    expect(loadDay().done).toEqual([]);
  });

  it("builds the widget snapshot from the app's data", async () => {
    const { buildWidgetState } = await import("../src/native/widgetState");
    const s = (await buildWidgetState())!;
    expect(s.workout.items).toHaveLength(8);
    expect(s.workout.items[0]).toMatchObject({ key: "lat-pulldown", kind: "stack", weight: 47.5 });
    expect(s.workout.items[7].options.map((o) => o.id)).toEqual(["cable-lateral-raise", "shoulder-press-machine"]);
    expect(s.lifts.find((l) => l.id === "lat-pulldown")!.sessions.at(-1)!.value).toBe(47.5);
    expect(s.body.entries.at(-1)).toMatchObject({ w: 82.4, c: 92.5 });
    expect(s.week.goal).toBe(2);
  });
});
