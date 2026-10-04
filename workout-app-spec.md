# Workout App: Build Spec for Claude Code

## 0. Context

Personal workout app for one user (Avi). It runs on his Android phone, installed as an app icon, and works fully offline. It replaces a working single-file prototype (`gym-plan.html`, attached alongside this spec), which is the reference for layout, flow, and behaviour. Keep what it does well and improve the two things below.

**The user is non-technical.** Claude Code runs all commands, explains each step in plain English, and finishes with exact phone-install instructions (section 11).

### What changes from the prototype
1. Every exercise shows **which muscles it works** (body diagram plus labels).
2. **Better movement animations**: smoother, anatomically consistent, with proper equipment drawn.

Everything else in the prototype stays: it is good.

## 1. Goals and non-goals

**Goals**
- Follow a routine at the gym with one tap per set: exercise, reps, sets, rest.
- Exercises and routines are data, so they can be added, changed, or removed without touching code.
- Clean, fast, large-touch-target UI that is easy to read mid-workout.
- Local only: no accounts, no backend, no analytics, no network calls after install.
- Built to scale: the data model and storage already support workout logging and history later, even though the UI for it is not built now.

**Non-goals (for now)**
- Logging weight or reps per set, progress charts, social features, cloud sync, notifications.

## 2. Tech stack

- **Vite + React + TypeScript**, static build output only.
- **vite-plugin-pwa** (Workbox): precache everything so the app loads with no connection.
- **IndexedDB via Dexie** for storage, behind a small repository layer (see section 7).
- **Zod** to validate imported JSON.
- Plain CSS with design tokens (CSS variables). No UI framework needed.
- Fonts bundled locally (no Google Fonts requests). Suggested: Barlow and Barlow Condensed, as in the prototype.
- Tests: Vitest for the schema validation, the plan/phase logic, and the pose solver.

## 3. Screens

Bottom tab bar with four tabs: **Today, Routines, Library, Settings**.

### 3.1 Today
- Pick the session (for example A or B). Default to the one after the last completed session.
- Shows the exercise list for that session, estimated time, and a **Start** button.
- Choice between **Walk through** and **Full workout** views (both exist in the prototype).

### 3.2 Workout runner (walk through)
Same behaviour as the prototype:
- **One exercise at a time.** No supersets. The user finishes all sets on a machine, then moves on.
- Card shows: animation, name, reps, muscle diagram, 2-3 form cues, "Set X of Y".
- "Set done, start rest" starts the rest timer. After the last set it moves to the next exercise.
- Back and Skip ahead (a machine may be taken).
- Progress dots across the top.
- Rest timer: bottom bar, countdown, -15 / +15 / Skip, beep and vibration at zero.
- Hold exercises (plank) get a "Start N sec hold" button using the same timer.
- Text blocks (warm-up, finisher) with a Next button.
- Screen wake lock while a workout is active.
- On finishing, record the completed session (see section 7) and show a done screen.

### 3.3 Full workout view
All exercises of the session on one scrolling page, with animations, muscles, reps, sets, and rest. Same as the prototype.

### 3.4 Routines
- List routines, each with sessions (A, B, ...), each with an ordered list of blocks.
- Edit: reorder blocks (drag handle plus up/down buttons), set reps text, set count override, remove, add from library, add a text block.
- Create, duplicate, and delete routines.

### 3.5 Library
- Browse all exercises, search by name, filter by muscle group and equipment.
- Detail page: large animation, muscle diagram, cues, notes, equipment.
- Hide or delete an exercise (bundled exercises are hidden, not destroyed, and can be restored).

### 3.6 Settings
- **Phase:** set count for the main lifts (default: 2 sets in weeks 1-3, 3 sets from week 4). The prototype's "Phase" selector.
- Default rest: 30, 45, or 60 sec.
- Theme: system, light, or dark.
- **Import** exercises or routines (paste JSON or choose a file).
- **Export** all data as one JSON file (backup).
- Reset to defaults (with confirmation).

## 4. Adding and changing exercises (important workflow)

The user asks Claude (in chat) to add, change, or remove exercises. Claude replies with a JSON pack. The user then does one of:
1. **In the app:** Settings, then Import, then paste the JSON. The app validates it, shows a preview ("Adds 3 exercises, updates 1"), and applies it on confirm.
2. **In the repo:** Claude Code adds the file to `src/data/` and rebuilds.

Requirements:
- Importing an exercise with an existing `id` updates it. A new `id` adds it.
- A pack can also contain routines, and a list of `remove` ids.
- Invalid JSON never partially applies. Show a clear error that says which field is wrong.
- Imported data is stored in IndexedDB and survives app updates.
- Publish the pack schema as `docs/pack-schema.md` plus a JSON Schema file, so Claude chat can generate valid packs.

## 5. Data model

All records carry `schemaVersion`. Migrations are numbered functions, run on startup.

```ts
type MuscleId =
  | "chest" | "front_delts" | "side_delts" | "rear_delts"
  | "biceps" | "triceps" | "forearms"
  | "upper_back" | "lats" | "traps" | "lower_back"
  | "abs" | "obliques"
  | "glutes" | "quads" | "hamstrings" | "adductors"
  | "calves" | "tibialis" | "hip_flexors";

interface Exercise {
  id: string;                 // kebab-case, unique
  name: string;
  equipment: string[];        // e.g. ["machine"], ["dumbbell"], ["cable"], ["bodyweight"]
  muscles: { primary: MuscleId[]; secondary: MuscleId[] };
  cues: string[];             // 2-3 short form cues
  notes?: string;             // cautions, e.g. "Keep range small if shoulder is sore"
  defaultReps: string;        // free text, e.g. "10-12", "30 sec hold", "10 per side"
  holdSeconds?: number;       // if set, shows the hold timer button
  animation: AnimationSpec;   // see section 6
  hidden?: boolean;
}

interface Block {
  type: "exercise" | "text";
  exerciseId?: string;        // for type "exercise"
  reps?: string;              // overrides defaultReps
  sets?: number | "phase";    // "phase" = follow the Settings phase value
  restSeconds?: number;       // overrides the default rest
  title?: string;             // for text blocks
  icon?: string;
  lines?: string[];           // for text blocks
}

interface Session { id: string; name: string; blocks: Block[]; }
interface Routine { id: string; name: string; sessions: Session[]; }

interface Settings {
  phaseSets: number;          // 2 or 3 (or any integer)
  defaultRest: number;
  theme: "system" | "light" | "dark";
  activeRoutineId: string;
}

// Written now (completion only), UI for it comes later.
interface WorkoutLog {
  id: string;
  date: string;               // ISO
  routineId: string;
  sessionId: string;
  durationSeconds?: number;
  sets?: { exerciseId: string; setIndex: number; weightKg?: number; reps?: number }[]; // future
}
```

## 6. Muscles and animation (the two upgrades)

### 6.1 Muscle diagram
- A clean, stylised **front and back body** SVG (neutral silhouette, not photographic), with one path per `MuscleId`.
- **Primary** muscles in the accent colour, **secondary** in a lighter tint, others in neutral.
- Show the front or back view automatically, or both side by side, depending on where the highlighted muscles are.
- Under the diagram, show text chips: "Primary: Quads, Glutes" and "Also: Hamstrings, Calves". Never rely on colour alone.
- Tap the diagram to enlarge it.

### 6.2 Better animation
Replace the prototype's raw-coordinate stick figure with a **joint-angle skeleton**:
- Fixed limb lengths (upper arm, forearm, torso, thigh, shin, foot). Poses are defined by **joint angles**, solved with forward kinematics, so limbs never stretch or shrink between frames. (The prototype had this flaw.)
- **Keyframes** with named phases, for example `start`, `bottom`, `top`, each with a duration and easing (ease-in-out). Support tempo, such as 3 sec up and 3 sec down for calf raises and tibialis raises, and brief pauses at the end range.
- Body drawn with tapered limbs, rounded joints, a head, a torso shape, and a far-side limb in a muted tone for depth.
- **Equipment drawn properly** (leg press sled and plate, bench, seat, pad, cable and pulley with a moving cable line, dumbbell, wall, step). Equipment can be attached to a joint or fixed.
- A **small phase label** under the figure ("Lower", "Push", "Squeeze") synced to the keyframes.
- Controls: tap to pause, a speed toggle (1x, 0.5x), and a **Start / End pose strip** showing the two end positions as still frames.
- Respect `prefers-reduced-motion`: show the static start and end poses instead of looping.
- Rendered as inline SVG with `requestAnimationFrame` (single shared loop, paused when off screen).

```ts
interface AnimationSpec {
  view: "side";                         // front view can be added later
  equipment: EquipmentSpec[];
  keyframes: { name: string; durationMs: number; ease?: "inOut" | "linear"; pose: Pose }[];
  loop: "pingpong" | "cycle";
  alternateSides?: boolean;             // e.g. dead bug, lunges
}
// Pose = joint angles in degrees (torso, neck, shoulder, elbow, hip, knee, ankle for near and far limbs)
// plus root position. Document the exact format in docs/pack-schema.md.
```

Because animation is data, the user can ask Claude chat for a new exercise and get a valid `AnimationSpec` back.

## 7. Storage and scalability

- **Repository layer** (`ExerciseRepo`, `RoutineRepo`, `SettingsRepo`, `LogRepo`) so the UI never touches Dexie directly. A later move to sync or a backend only replaces the repos.
- Bundled seed data (section 9) loads on first run and is merged with user data: user edits override bundled items by `id`.
- Call `navigator.storage.persist()` on first run to reduce the chance of the browser clearing data.
- A completed workout writes a `WorkoutLog` (date, routine, session). No UI for history yet, beyond using it to pick the next session on the Today tab.
- Export and import cover every table.

## 8. UX and visual direction

- Take the prototype's look as the base: concrete-grey light theme, navy ink, signal-blue accent, yellow rest bar, condensed headline font, plus the dark theme.
- Clean, calm, high contrast. Minimal decoration. One accent colour.
- Touch targets at least 48px. Primary action button at the bottom of the card, reachable with one thumb.
- Safe-area insets respected (notch and gesture bar). Bottom tab bar and rest bar must not overlap.
- Works in portrait first. Landscape just needs to not break.
- Sentence-case labels. Buttons say what they do ("Set done, start rest").
- No emoji except the prototype's two text-block icons, which can become simple SVG icons.

## 9. Seed data (from the current plan)

**Routine "Full body A/B", 2 sessions. One exercise per block. Main lifts: sets "phase". Calves and tibialis: 2 sets fixed. Rest default 45 sec.**

Session A: Warm-up (text), leg press, seated cable row, pec deck, lat pulldown, dumbbell Romanian deadlift, plank (30 sec hold), standing calf raise, tibialis raise, Finisher (text).
Session B: Warm-up (text), goblet squat, chest-supported row, cable chest fly, face pull, glute bridge, dead bug, standing calf raise, tibialis raise, Finisher (text).

Reps, cues, and cautions come from the prototype's `EX` and `PLAN` objects. Muscles:

| Exercise | Primary | Secondary |
|---|---|---|
| Leg press | quads, glutes | hamstrings, adductors, calves |
| Seated cable row | lats, upper_back | rear_delts, biceps, forearms |
| Pec deck | chest | front_delts |
| Lat pulldown | lats | biceps, rear_delts, upper_back |
| Dumbbell RDL | hamstrings, glutes | lower_back, forearms, traps |
| Plank | abs | obliques, glutes, front_delts, lower_back |
| Standing calf raise | calves | (none) |
| Tibialis raise | tibialis | (none) |
| Goblet squat | quads, glutes | adductors, abs, upper_back |
| Chest-supported row | upper_back, lats | rear_delts, biceps |
| Cable chest fly | chest | front_delts |
| Face pull | rear_delts, upper_back | traps, biceps |
| Glute bridge | glutes | hamstrings, abs |
| Dead bug | abs | obliques, hip_flexors |

Notes to carry as `notes`: pec deck and cable fly: "Keep a slight elbow bend and avoid a deep stretch behind the body (sensitive left shoulder)". Calf raise: "Slow tempo, bodyweight first". Tibialis raise: "Sharp or lingering shin pain means go lighter".

Re-author all 14 animations in the new joint-angle format and check each against the equipment and movement.

## 10. Quality bar and acceptance criteria

- [ ] Installs from Chrome on Android with "Add to Home screen"; opens full screen with its own icon and name.
- [ ] After first load, works with airplane mode on (including reload).
- [ ] No network requests after install (verify in DevTools, Network tab).
- [ ] A full session can be completed with taps only, with the rest timer, skip, and back all working, and the timer keeps correct time when the screen locks and unlocks.
- [ ] Every exercise shows a muscle diagram with primary and secondary muscles, plus text chips.
- [ ] All 14 animations loop smoothly, with constant limb lengths and correct equipment.
- [ ] Importing a valid pack adds or updates exercises; an invalid pack changes nothing and shows a clear error.
- [ ] Export, then wipe data, then import, restores everything.
- [ ] Light and dark themes both pass contrast checks. Reduced motion is respected.
- [ ] Lighthouse PWA and accessibility scores of 90 or more.
- [ ] Unit tests pass (schema validation, set and phase logic, pose solver).

## 11. Hosting and install (explain to the user in plain language)

A PWA can only be installed from **HTTPS** (or localhost), so a file opened from the phone's storage or a plain local network address cannot install as an app. Use a **static host** such as GitHub Pages or Netlify. The host serves only the app's files. **All data stays on the phone** in the browser's storage. Nothing is uploaded.

Claude Code should:
1. Build the app and set up deployment to a free static host (the user has a GitHub account, so GitHub Pages is the default).
2. Give the user the URL and these steps: open the URL in Chrome on the phone, then menu, then "Install app" or "Add to Home screen", then open it once online so it caches, then test in airplane mode.
3. Explain that clearing Chrome's site data deletes the app's data, and remind the user to use Settings, then Export, for backups.

## 12. Deliverables

- Working app in a repo with a short README (how to run, build, and deploy, in plain English).
- `docs/pack-schema.md` and a JSON Schema file for exercise and routine packs.
- `src/data/` seed files for exercises and the default routine.
- Passing tests and a deployed URL.
