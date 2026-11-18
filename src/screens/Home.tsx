import { useEffect, useRef, useState } from "react";
import { ExerciseRepo, LogRepo, RoutineRepo, SettingsRepo } from "../db/repos";
import { useData } from "../components/hooks";
import { repsFor, setsFor, estimateMinutes } from "../model/plan";
import {
  bestWeight, dateLabel, isNewBest, lastWeight, localDate, roman, takesWeight, totalKg,
  weekPhrase, weekStreak, weekSummary, weekdayName,
} from "../model/progress";
import { ExerciseSheet } from "../components/ExerciseSheet";
import { BackupButton } from "../components/BackupButton";
import { Dial } from "../components/Dial";
import { Glyph, Monogram } from "../components/Glyph";
import type { Exercise } from "../model/schema";
import { DAY_EXTERNAL, chosenId, finishDay, freshDay as fresh, loadDay, optionsOf as slotOptions, saveDay, slotsOf, weightOf, type DayState, type Slot } from "../model/day";

const TICK_MS = 450; // the row moves to Done after its tick animation (build pack §4)

export function Home() {
  const data = useData(async () => {
    const settings = await SettingsRepo.get();
    const routines = await RoutineRepo.all();
    const routine = routines.find((r) => r.id === settings.activeRoutineId) ?? routines[0];
    return { settings, routines, routine, exercises: await ExerciseRepo.all(true), logs: await LogRepo.all() };
  });
  const [day, setDay] = useState<DayState>(loadDay);
  const [open, setOpen] = useState<string | null>(null);
  const [ticking, setTicking] = useState<string[]>([]);
  const [finishing, setFinishing] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => saveDay(day), [day]);
  // Widget actions applied while the app was closed change today's state from outside.
  useEffect(() => { const f = () => setDay(loadDay()); window.addEventListener(DAY_EXTERNAL, f); return () => window.removeEventListener(DAY_EXTERNAL, f); }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (!data) return null;
  const { settings, routines, routine, exercises, logs } = data;
  if (!routine) return <p className="status">Create a routine in the Routines tab.</p>;
  const session = routine.sessions[0];
  const exMap = new Map<string, Exercise>(exercises.map((e) => [e.id, e]));
  const today = localDate(new Date());
  const todayLog = [...logs].reverse().find((l) => l.routineId === routine.id && localDate(new Date(l.date)) === today);
  const logged = !!todayLog && !day.editing && day.done.length === 0;

  const wk = weekSummary(logs, routines, settings);
  const streak = weekStreak(logs, routines, settings);
  const FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const nextOpenDay = (() => { const d = wk.days.find((x) => !x.done); return d ? FULL[d.day] : weekdayName(); })();

  const items = slotsOf(routine);
  const warm = session.blocks.filter((b) => b.type === "text");
  const position = new Map(items.map((b, i) => [b.exerciseId, i + 1]));
  const isDone = (id: string) => day.done.includes(id);
  const todo = items.filter((b) => !isDone(b.exerciseId));
  const done = items.filter((b) => isDone(b.exerciseId));
  const allDone = items.length > 0 && todo.length === 0;

  const optionsOf = (b: Slot) => slotOptions(b, exMap);
  const chosen = (b: Slot) => chosenId(b, day, logs, exMap);
  const choose = (key: string, id: string) => setDay((d) => ({ ...d, choice: { ...(d.choice ?? {}), [key]: id } }));
  const repsOf = (b: Slot, id: string) => (id === b.exerciseId ? repsFor(b, exMap.get(id)) : exMap.get(id)?.defaultReps ?? "");
  const weightFor = (id: string) => weightOf(id, day, logs);
  const setWeight = (id: string, v?: number) => setDay((d) => {
    const weights = { ...d.weights };
    if (v === undefined) delete weights[id]; else weights[id] = v;
    return { ...d, weights };
  });
  const prevBest = (id: string) => bestWeight(logs, id, `${today}T00:00:00`);

  const toggle = (key: string) => {
    if (isDone(key)) { setDay((d) => ({ ...d, done: d.done.filter((x) => x !== key) })); return; }
    if (ticking.includes(key)) return;
    setTicking((t) => [...t, key]);
    timers.current.push(window.setTimeout(() => {
      setTicking((t) => t.filter((x) => x !== key));
      setDay((d) => ({ ...d, done: d.done.includes(key) ? d.done : [...d.done, key], startedAt: d.startedAt ?? Date.now() }));
    }, TICK_MS));
  };

  const finish = async () => {
    if (finishing) return;
    if (!done.length && !confirm("Nothing is ticked yet. Save the workout anyway?")) return;
    setFinishing(true);
    await new Promise((r) => setTimeout(r, 600)); // let the gold shimmer play
    await finishDay(day, { routine, settings, exMap, logs });
    setFinishing(false);
    setDay(fresh());
    scrollTo({ top: 0, behavior: "smooth" });
  };

  // Status line under the dial (voice sheet §5).
  const status = logged ? weekPhrase(wk.gym, wk.goal)
    : allDone ? "That's the lot."
    : done.length ? `${nextOpenDay}'s still open.`
    : "Your session is ready.";
  const minutes = estimateMinutes(session, settings, exMap);
  const dialSub = logged ? "Session saved" : allDone ? "That's the lot" : `about ${minutes} min`;

  // Saved card numbers come from today's log.
  const savedStats = (() => {
    if (!todayLog) return "";
    const ids = [...new Set((todayLog.sets ?? []).map((s) => s.exerciseId))];
    const bests = ids.filter((id) => {
      const w = Math.max(...(todayLog.sets ?? []).filter((s) => s.exerciseId === id && s.weightKg !== undefined).map((s) => s.weightKg!));
      return Number.isFinite(w) && isNewBest(w, bestWeight(logs, id, todayLog.date));
    }).length;
    const parts = [];
    parts.push(`${ids.length} exercise${ids.length === 1 ? "" : "s"}`);
    if (bests) parts.push(`${bests} new best${bests === 1 ? "" : "s"}`);
    return parts.join(" · ");
  })();

  /** Reopen today's saved session: ticks, weights and shoulder pick come back as they were saved. */
  const editToday = () => {
    if (!todayLog) return;
    const loggedIds = new Set((todayLog.sets ?? []).map((s) => s.exerciseId));
    const doneKeys: string[] = [];
    const choice: Record<string, string> = {};
    for (const b of items) {
      const hit = optionsOf(b).find((id) => loggedIds.has(id));
      if (hit) { doneKeys.push(b.exerciseId); if (hit !== b.exerciseId) choice[b.exerciseId] = hit; }
    }
    const weights: Record<string, number> = {};
    for (const s of todayLog.sets ?? []) if (s.weightKg !== undefined) weights[s.exerciseId] = s.weightKg;
    setDay({ date: today, done: doneKeys, weights, choice, editing: todayLog.id });
    scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => setDay(fresh());

  const row = (b: Slot) => {
    const id = chosen(b);
    const ex = exMap.get(id);
    const n = position.get(b.exerciseId)!;
    const d = isDone(b.exerciseId);
    const tk = ticking.includes(b.exerciseId);
    const w = ex && takesWeight(ex) ? weightFor(id) : undefined;
    const kind = ex?.weightKind;
    const others = optionsOf(b).filter((x) => x !== id);
    const pb = d && w !== undefined && isNewBest(w, prevBest(id));
    const reps = `${setsFor(b, settings)} × ${repsOf(b, id)}`;
    const total = ex && w !== undefined && kind === "plates" && ex.baseKg ? totalKg(ex, w) : undefined;
    const meta = d
      ? (kind === "stack" ? `stack ${w ?? "—"}` : kind === "dumbbell" ? `${w ?? "—"} kg dumbbell` : total !== undefined ? `≈ ${total} kg` : reps)
      : null;
    return (
      <li key={b.exerciseId} className={`crow ${d ? "done" : ""} ${tk ? "ticking" : ""}`}>
        <button className="open" disabled={!ex} onClick={() => setOpen(b.exerciseId)} aria-label={`${ex?.name ?? id}. Show exercise`}>
          <span className="numeral" aria-hidden="true">{roman(n)}</span>
          <span className="text">
            <span className="name">{ex?.name ?? `Missing: ${id}`}<span className="strike" aria-hidden="true" /></span>
            <span className="rowmeta" style={{ display: "block" }}>
              {meta ?? (kind === "plates" && w !== undefined
                ? <>{w} kg plates{total !== undefined && <> · <span className="gold">≈ {total} kg</span></>}</>
                : <>{reps}{kind === "stack" ? " · stack" : kind === "dumbbell" ? " · dumbbell" : ""}{ex?.unilateral ? " · one arm" : ""}</>)}
            </span>
          </span>
          <span className="weight num">{w !== undefined ? <>{w}{kind !== "stack" && <small>KG</small>}</> : "—"}</span>
        </button>
        {pb && <span className="pb">PB</span>}
        <button className="tickbtn" onClick={() => toggle(b.exerciseId)} aria-label={`${d ? "Mark not done" : "Mark done"}: ${ex?.name ?? id}`} aria-pressed={d}>
          <span className="ring"><span className="fill" /><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>
        </button>
        {!d && others.length > 0 && (
          <button className="alt" style={{ gridColumn: "2 / 4" }} onClick={() => choose(b.exerciseId, others[0])}>
            <Glyph name="switch" active size={13} /> Or: {others.map((x) => exMap.get(x)?.name).join(" / ")}
          </button>
        )}
      </li>
    );
  };

  const openBlock = open ? items.find((b) => b.exerciseId === open) : undefined;
  const openId = openBlock ? chosen(openBlock) : undefined;
  const openEx = openId ? exMap.get(openId) : undefined;

  return (
    <>
      <header className="home-head">
        <span className="label">{dateLabel()}</span>
        <Monogram size={36} />
      </header>

      <Dial done={done.length} total={items.length} sub={dialSub} logged={logged} />

      <div className="weekstrip" aria-label={`This week: ${wk.gym} of ${wk.goal} gym workouts`}>
        {wk.days.map((dd) => <span key={dd.day} className={`day ${dd.done ? "done" : ""}`}><span className="dot" aria-hidden="true" />{dd.name}</span>)}
        {wk.extraDays.map((n) => <span key={n} className="day done"><span className="dot" aria-hidden="true" />{n}</span>)}
        {streak > 0 && <><span className="div" aria-hidden="true" /><span className="streak"><Glyph name="award-streak" active size={12} />{streak}-week streak</span></>}
      </div>
      <p className={`status ${allDone || logged ? "gold" : ""}`}>{status}</p>

      {warm.slice(0, 1).map((b, i) => (
        <div key={i} className="warmup"><span className="label gold">{b.title}</span><p>{(b.lines ?? []).join(", ")}</p></div>
      ))}

      {logged ? (
        <div className="panel saved finish-wrap">
          <span className="label gold">Session logged</span>
          <h2>{weekPhrase(wk.gym, wk.goal)}</h2>
          {savedStats && <p className="meta">{savedStats}</p>}
          <BackupButton />
          <button className="link" onClick={editToday}>Edit today's session</button>
        </div>
      ) : (
        <>
          {todo.length > 0 && <>
            <p className="label section-label">Still to do</p>
            <ul className="rows">{todo.map(row)}</ul>
          </>}
          <div className="finish-wrap">
            {day.editing && <p className="meta center" style={{ marginBottom: 10 }}>Editing today's saved session. Finishing replaces it.</p>}
            <button className={`btn ${allDone ? "btn-finish sheen" : "btn-secondary"} ${finishing ? "play" : ""}`} onClick={finish}>
              {day.editing ? "Save changes" : "Finish workout"}
            </button>
            {day.editing && <button className="link" style={{ width: "100%", justifyContent: "center" }} onClick={cancelEdit}>Keep the saved session</button>}
          </div>
          {done.length > 0 && <>
            <p className="label section-label">Done</p>
            <ul className="rows">{done.map(row)}</ul>
          </>}
        </>
      )}

      {openEx && openBlock && (
        <ExerciseSheet
          ex={openEx}
          index={position.get(openBlock.exerciseId)!}
          total={items.length}
          reps={`${setsFor(openBlock, settings)} × ${repsOf(openBlock, openEx.id)}`}
          options={optionsOf(openBlock).map((x) => ({ id: x, name: exMap.get(x)!.name }))}
          onChoose={(x) => choose(openBlock.exerciseId, x)}
          weight={takesWeight(openEx) ? day.weights[openEx.id] : undefined}
          last={lastWeight(logs, openEx.id)}
          best={prevBest(openEx.id)}
          onWeight={(v) => setWeight(openEx.id, v)}
          done={isDone(openBlock.exerciseId)}
          onDone={() => toggle(openBlock.exerciseId)}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
