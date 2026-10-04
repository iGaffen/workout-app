import Dexie, { type Table } from "dexie";
import type { BodyLog, Exercise, Routine, Settings, WorkoutLog } from "../model/schema";

export interface Meta { key: string; value: unknown }

/** Only repos import this file. The UI never touches Dexie directly. */
export class GymDB extends Dexie {
  exercises!: Table<Exercise, string>;   // user-added exercises and overrides of bundled ones
  routines!: Table<Routine, string>;     // user-added routines and edited copies of bundled ones
  settings!: Table<Settings & { key: string }, string>;
  logs!: Table<WorkoutLog, string>;
  meta!: Table<Meta, string>;
  body!: Table<BodyLog, string>;
  constructor(name = "gym-plan") {
    super(name);
    this.version(1).stores({ exercises: "id", routines: "id", settings: "key", logs: "id, date, routineId", meta: "key" });
    this.version(2).stores({ body: "id, date" });
  }
}

export let db = new GymDB();
/** Tests swap in a fresh database. */
export function useDB(d: GymDB) { db = d; }
