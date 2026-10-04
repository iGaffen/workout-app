import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { BodyRepo, ExerciseRepo, RoutineRepo, SettingsRepo, LogRepo, applyPack, exportAll, wipeAll } from "../src/db/repos";
import { parsePack } from "../src/model/pack";
import exercises from "../src/data/exercises.json";

describe("repositories", () => {
  it("export, wipe, import restores everything", async () => {
    await ExerciseRepo.put({ ...(exercises[0] as never), id: "my-move", name: "My move" });
    await ExerciseRepo.remove("plank");
    await SettingsRepo.put({ ...(await SettingsRepo.get()), phaseSets: 3 });
    await LogRepo.add({ date: "2026-01-01T10:00:00Z", routineId: "full-body-ab", sessionId: "a" });
    await BodyRepo.put("2026-01-02", { weightKg: 90 });
    await BodyRepo.put("2026-01-02", { waistCm: 101 });
    const r = (await RoutineRepo.all())[0];
    await RoutineRepo.put({ ...r, name: "Renamed" });
    const backup = JSON.stringify(await exportAll());

    await wipeAll();
    expect(await ExerciseRepo.get("my-move")).toBeUndefined();
    expect((await SettingsRepo.get()).phaseSets).toBe(2);

    const p = parsePack(backup);
    if (!p.ok) throw new Error(p.error);
    await applyPack(p.pack);
    expect((await ExerciseRepo.get("my-move"))?.name).toBe("My move");
    expect((await ExerciseRepo.get("plank"))?.hidden).toBe(true);
    expect((await SettingsRepo.get()).phaseSets).toBe(3);
    expect(await LogRepo.all()).toHaveLength(1);
    expect(await BodyRepo.all()).toMatchObject([{ date: "2026-01-02", weightKg: 90, waistCm: 101 }]);
    expect((await RoutineRepo.all())[0].name).toBe("Renamed");
  });
  it("invalid pack changes nothing", async () => {
    const before = JSON.stringify(await exportAll());
    await expect(applyPack({ exercises: [{ id: "BAD" }] } as never)).rejects.toThrow();
    expect(JSON.stringify(await exportAll())).toBe(before);
  });
  it("bundled exercises hide and restore", async () => {
    await ExerciseRepo.remove("dead-bug");
    expect((await ExerciseRepo.all()).some((e) => e.id === "dead-bug")).toBe(false);
    await ExerciseRepo.setHidden("dead-bug", false);
    expect((await ExerciseRepo.all()).some((e) => e.id === "dead-bug")).toBe(true);
  });
});
