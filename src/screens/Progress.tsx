import { useState } from "react";
import { BodyRepo, LogRepo, RemindersRepo, RoutineRepo, SettingsRepo } from "../db/repos";
import { useData } from "../components/hooks";
import { TrendChart } from "../components/TrendChart";
import { daysUntilDue, effectiveSettings, localDate, trainingWeek, weekSummary, weeklyAverages } from "../model/progress";

const num = (s: string) => { const n = parseFloat(s.replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : undefined; };

export function Progress() {
  const data = useData(async () => ({
    logs: await LogRepo.all(), body: await BodyRepo.all(), routines: await RoutineRepo.all(),
    settings: await SettingsRepo.get(), lastPhoto: await RemindersRepo.lastPhoto(), lastExport: await RemindersRepo.lastExport(),
  }));
  const today = localDate(new Date());
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [saved, setSaved] = useState("");
  if (!data) return <p className="sub">Loading…</p>;
  const { logs, body, routines, settings, lastPhoto, lastExport } = data;
  const wk = weekSummary(logs, routines, settings);
  const eff = effectiveSettings(settings, logs);
  const photoDays = daysUntilDue(lastPhoto, 28);
  const backupDays = daysUntilDue(lastExport, 30);
  const todayEntry = body.find((b) => b.date === today);
  const sessName = (rid: string, sid: string) => {
    const r = routines.find((x) => x.id === rid);
    const s = r?.sessions.find((x) => x.id === sid);
    return s ? `${r!.name}: ${s.name}` : sid;
  };
  const toPoints = (k: "weightKg" | "waistCm") => weeklyAverages(body, k).map((w) => ({ label: w.week, value: w.avg, n: w.n }));
  const history = [...logs].sort((a, b) => b.date.localeCompare(a.date));

  const save = async () => {
    const w = num(weight), c = num(waist);
    if (w === undefined && c === undefined) return;
    await BodyRepo.put(today, { ...(w !== undefined ? { weightKg: w } : {}), ...(c !== undefined ? { waistCm: c } : {}) });
    setWeight(""); setWaist(""); setSaved("Saved for today.");
  };

  return (
    <>
      <div className="top"><h1>Progress</h1></div>

      <div className="card">
        <div className="blockhead"><h2>This week</h2><span className="sub">Training week {trainingWeek(logs)} · {eff.phaseSets} sets{settings.phaseAuto ? " (auto)" : ""}</span></div>
        <div className="days" aria-label={`${Math.min(wk.gym, wk.goal)} of ${wk.goal} gym workouts this week`}>
          {wk.days.map((d) => <span key={d.day} className={`daychip ${d.done ? "done" : ""}`}>{d.name}{d.done ? " ✓" : ""}</span>)}
          {wk.extraDays.map((n) => <span key={n} className="daychip done extra">{n} ✓</span>)}
        </div>
        <p className="big goalnum">{wk.gym} of {wk.goal} gym workouts</p>
        {wk.cardio > 0 && <p className="ok">+{wk.cardio} cardio {wk.cardio === 1 ? "session" : "sessions"} (bonus)</p>}
        <p className="sub">A gym workout on another day still counts. Change your days in Settings.</p>
      </div>

      <div className="card">
        <h2>Log body measurements</h2>
        <p className="sub">Weigh in the morning, after the toilet, 3–4 times a week. Measure your waist once a week at the belly button, relaxed.</p>
        <div className="row gap">
          <label className="field half">Weight (kg)<input inputMode="decimal" value={weight} placeholder={todayEntry?.weightKg ? String(todayEntry.weightKg) : ""} onChange={(e) => { setWeight(e.target.value); setSaved(""); }} /></label>
          <label className="field half">Waist (cm)<input inputMode="decimal" value={waist} placeholder={todayEntry?.waistCm ? String(todayEntry.waistCm) : ""} onChange={(e) => { setWaist(e.target.value); setSaved(""); }} /></label>
        </div>
        <button className="cta" onClick={save} disabled={num(weight) === undefined && num(waist) === undefined}>Save today's entry</button>
        {saved && <p className="ok" role="status">{saved}</p>}
      </div>

      <div className="card">
        <h2>Body weight</h2>
        <p className="sub">Weekly average. Single days swing 1–2 kg with water and salt, so watch the trend.</p>
        <TrendChart points={toPoints("weightKg")} unit="kg" name="Body weight" />
      </div>

      <div className="card">
        <h2>Waist</h2>
        <p className="sub">The best fat-loss signal. If waist drops while weight holds, you are losing fat and gaining muscle.</p>
        <TrendChart points={toPoints("waistCm")} unit="cm" name="Waist" />
      </div>

      <div className="card">
        <h2>Progress photos</h2>
        <p className={photoDays <= 0 ? "due" : "sub"}>{lastPhoto ? (photoDays <= 0 ? "Photos are due." : `Next photos in ${photoDays} days.`) : "Take your first set before you start."}</p>
        <ul className="cues">
          <li>Every 4 weeks: front, side, back</li>
          <li>Same spot, light, time of day and clothes</li>
          <li>Keep them in a gallery album, not in this app</li>
        </ul>
        <button className="secondary" onClick={() => RemindersRepo.markPhoto()}>I took my photos today</button>
      </div>

      {backupDays <= 0 && logs.length > 0 && (
        <div className="card"><h2>Backup due</h2><p className="sub">{lastExport ? "It has been over 30 days since your last backup." : "You have not backed up yet."} Go to Settings, then Export all data.</p></div>
      )}

      <div className="card">
        <h2>History</h2>
        {history.length === 0 && <p className="sub">Finished workouts show up here.</p>}
        <ul className="history">
          {history.slice(0, 60).map((l) => {
            const w = (l.sets ?? []).filter((s) => s.weightKg !== undefined);
            return (
              <li key={l.id}>
                <strong>{new Date(l.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</strong>
                <span>{sessName(l.routineId, l.sessionId)}</span>
                <span className="sub">{l.durationSeconds ? `${Math.round(l.durationSeconds / 60)} min` : ""}{w.length ? ` · ${w.length} sets with weight logged` : ""}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
