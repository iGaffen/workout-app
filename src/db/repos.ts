import seedExercises from "../data/exercises.json";
import seedRoutines from "../data/routines.json";
import { db } from "./db";
import { migrate } from "../model/migrations";
import { DEFAULT_SETTINGS } from "../model/plan";
import { PackSchema, SCHEMA_VERSION, type Exercise, type Pack, type Routine, type Settings, type WorkoutLog } from "../model/schema";

const BUNDLED_EX = seedExercises as Exercise[];
const BUNDLED_RO = seedRoutines as Routine[];
const bundledExIds = new Set(BUNDLED_EX.map((e) => e.id));
const bundledRoIds = new Set(BUNDLED_RO.map((r) => r.id));

// Change notifications so screens can refresh.
type L = () => void;
const listeners = new Set<L>();
export const onChange = (l: L) => { listeners.add(l); return () => { listeners.delete(l); }; };
const changed = () => listeners.forEach((l) => l());

const stamp = <T extends object>(x: T) => ({ ...x, schemaVersion: SCHEMA_VERSION });

async function getMeta<T>(key: string, fallback: T): Promise<T> {
  return ((await db.meta.get(key))?.value as T) ?? fallback;
}
const setMeta = (key: string, value: unknown) => db.meta.put({ key, value });

/** Merge bundled items with user items: user wins by id. */
function merge<T extends { id: string }>(bundled: T[], user: T[], removed: string[] = []): T[] {
  const map = new Map<string, T>();
  bundled.forEach((b) => { if (!removed.includes(b.id)) map.set(b.id, b); });
  user.forEach((u) => map.set(u.id, u));
  return [...map.values()];
}

export const ExerciseRepo = {
  async all(includeHidden = false): Promise<Exercise[]> {
    const list = merge(BUNDLED_EX, (await db.exercises.toArray()).map(migrate));
    return includeHidden ? list : list.filter((e) => !e.hidden);
  },
  async get(id: string) { return (await this.all(true)).find((e) => e.id === id); },
  isBundled: (id: string) => bundledExIds.has(id),
  async put(e: Exercise) { await db.exercises.put(stamp(e)); changed(); },
  async setHidden(id: string, hidden: boolean) {
    const e = await this.get(id);
    if (e) await this.put({ ...e, hidden });
  },
  /** Bundled exercises are hidden (restorable); user ones are deleted. */
  async remove(id: string) {
    if (bundledExIds.has(id)) await this.setHidden(id, true);
    else { await db.exercises.delete(id); changed(); }
  },
};

export const RoutineRepo = {
  async all(): Promise<Routine[]> {
    return merge(BUNDLED_RO, (await db.routines.toArray()).map(migrate), await getMeta<string[]>("removedRoutines", []));
  },
  async get(id: string) { return (await this.all()).find((r) => r.id === id); },
  async put(r: Routine) {
    await db.routines.put(stamp(r));
    const rem = await getMeta<string[]>("removedRoutines", []);
    if (rem.includes(r.id)) await setMeta("removedRoutines", rem.filter((x) => x !== r.id));
    changed();
  },
  async remove(id: string) {
    await db.routines.delete(id);
    if (bundledRoIds.has(id)) await setMeta("removedRoutines", [...new Set([...(await getMeta<string[]>("removedRoutines", [])), id])]);
    changed();
  },
};

export const SettingsRepo = {
  async get(): Promise<Settings> {
    const s = await db.settings.get("settings");
    if (!s) return { ...DEFAULT_SETTINGS };
    const { key: _k, ...rest } = migrate(s);
    return { ...DEFAULT_SETTINGS, ...rest };
  },
  async put(s: Settings) { await db.settings.put({ ...stamp(s), key: "settings" }); changed(); },
};

export const LogRepo = {
  all: () => db.logs.toArray(),
  async add(l: Omit<WorkoutLog, "id">) {
    const id = `${l.date}-${Math.random().toString(36).slice(2, 8)}`;
    await db.logs.put(stamp({ ...l, id }));
    changed();
  },
};

/** First run: ask the browser to keep our data. */
export async function init() {
  if (!(await getMeta("initialised", false))) {
    try { await navigator.storage?.persist?.(); } catch { /* not supported */ }
    await setMeta("initialised", true);
  }
}

/** Apply a validated pack in one transaction: all or nothing. */
export async function applyPack(p: Pack) {
  const checked = PackSchema.parse(p);
  await db.transaction("rw", [db.exercises, db.routines, db.settings, db.logs, db.meta], async () => {
    for (const e of checked.exercises ?? []) await db.exercises.put(stamp(e) as Exercise);
    for (const r of checked.routines ?? []) await RoutineRepo.put(r as Routine);
    for (const id of checked.remove ?? []) {
      const isEx = bundledExIds.has(id) || (await db.exercises.get(id));
      if (isEx) await ExerciseRepo.remove(id);
      if (bundledRoIds.has(id) || (await db.routines.get(id))) await RoutineRepo.remove(id);
    }
    if (checked.settings) await db.settings.put({ ...stamp(checked.settings), key: "settings" });
    for (const l of checked.logs ?? []) await db.logs.put(stamp(l));
    if (checked.hiddenBundled) await setMeta("removedRoutines", checked.hiddenBundled);
  });
  changed();
}

/** Full backup: every table. */
export async function exportAll(): Promise<Pack> {
  return {
    schemaVersion: SCHEMA_VERSION,
    exercises: await db.exercises.toArray(),
    routines: await db.routines.toArray(),
    settings: await SettingsRepo.get(),
    logs: await db.logs.toArray(),
    hiddenBundled: await getMeta<string[]>("removedRoutines", []),
  };
}

export async function wipeAll() {
  await db.transaction("rw", [db.exercises, db.routines, db.settings, db.logs, db.meta], async () => {
    await Promise.all([db.exercises.clear(), db.routines.clear(), db.settings.clear(), db.logs.clear(), db.meta.clear()]);
    await setMeta("initialised", true);
  });
  changed();
}
