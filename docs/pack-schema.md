# Pack format (exercises and routines)

A **pack** is a JSON file that adds, updates, or removes exercises and routines.
Paste it into the app (Settings → Import) or drop it into `src/data/`.
The machine-readable version is [`pack-schema.json`](pack-schema.json) (JSON Schema 2020-12).

```json
{
  "exercises": [ { ...Exercise } ],
  "routines":  [ { ...Routine } ],
  "remove":    ["exercise-or-routine-id"]
}
```

Rules
- An exercise or routine whose `id` already exists is **updated** (replaced). A new `id` is **added**.
- `remove`: built-in exercises are hidden (they can be restored in the Library); your own are deleted. Routines are deleted.
- The whole pack is validated first. If anything is wrong, **nothing** is applied and the error names the field, e.g. `exercises[0].muscles.primary[0]: Invalid option`.
- A bare exercise object, a bare array of exercises, or a single routine object are also accepted.
- Full backups (Settings → Export) use the same format plus `settings`, `logs` and `hiddenBundled` (ids of built-in routines you deleted).
- `id`s are kebab-case: `cable-lateral-raise`.

## Exercise

| Field | Type | Notes |
|---|---|---|
| `id` | string | kebab-case, unique |
| `name` | string | |
| `equipment` | string[] | free text tags: `machine`, `cable`, `dumbbell`, `bodyweight`, `wall`… (used for the Library filter) |
| `muscles.primary` / `.secondary` | MuscleId[] | see list below; primary needs at least one |
| `cues` | string[] | 2–3 short form cues |
| `notes` | string? | cautions |
| `defaultReps` | string | `"10-12"`, `"30 sec hold"`, `"10 per side"` |
| `holdSeconds` | number? | shows a "Start N sec hold" button |
| `animation` | AnimationSpec | below |
| `hidden` | boolean? | |

**MuscleId**: `chest, front_delts, side_delts, rear_delts, biceps, triceps, forearms, upper_back, lats, traps, lower_back, abs, obliques, glutes, quads, hamstrings, adductors, calves, tibialis, hip_flexors`.

## Routine

```json
{ "id": "full-body-ab", "name": "Full body A/B", "sessions": [
  { "id": "a", "name": "Session A", "blocks": [
    { "type": "text", "title": "Warm-up", "icon": "bike", "lines": ["Bike 10 min"] },
    { "type": "exercise", "exerciseId": "leg-press", "reps": "10-12", "sets": "phase" },
    { "type": "exercise", "exerciseId": "standing-calf-raise", "sets": 2, "restSeconds": 30 }
  ]}
]}
```
- `sets`: a number, or `"phase"` to follow Settings → Phase (2 or 3).
- `restSeconds`: overrides Settings → Default rest.
- `icon` for text blocks: `bike` or `stairs`.

## AnimationSpec

Side view, figure **faces right**. Canvas is 240 × 170 SVG units, the floor is at **y = 152**, y grows **downward**. A flat foot sits at y ≈ 149.

```json
{
  "view": "side",
  "loop": "cycle",
  "alternateSides": false,
  "equipment": [ { "kind": "dumbbell", "attach": "hand" } ],
  "keyframes": [
    { "name": "Stand",  "durationMs": 1300, "pose": { ... } },
    { "name": "Hinge",  "durationMs": 1800, "pose": { ... } },
    { "name": "Pause",  "durationMs": 300,  "pose": { ... } }
  ]
}
```

### Timing
- Each keyframe's `durationMs` is the time to move **into** that keyframe from the previous one; its `name` is shown as the phase label during that move.
- `loop: "cycle"`: after the last keyframe the figure returns to the first one, taking keyframe 0's `durationMs` (so keyframe 0's name is the label for the return, e.g. "Push").
- `loop: "pingpong"`: plays forward, then back in reverse.
- Pause = repeat the same pose under a new name (e.g. "Pause", 600 ms).
- Tempo: 3 s up / 3 s down = `durationMs: 3000` on both moves.
- `ease`: `"inOut"` (default) or `"linear"`.
- `alternateSides: true` swaps near and far limbs every other cycle (dead bug, lunges).
- The Start / End strip shows keyframe 0 and the middle keyframe (cycle) or last keyframe (pingpong).

### Pose (joint angles, degrees)

```json
{
  "torso": 0,
  "neck": 0,
  "anchor": { "joint": "toe", "at": [134, 149] },
  "near": { "shoulder": 0, "armYaw": 0, "elbow": 0, "hip": 0, "knee": 0, "ankle": 0 },
  "far":  { "hip": -10 }
}
```

| Angle | 0 means | Positive means |
|---|---|---|
| `torso` | upright | leaning forward (toward +x). `90` = face-down horizontal, head right. `-90` = lying on back, head left |
| `neck` | head in line with torso | head tilts forward |
| `shoulder` | arm hangs along the torso | flexion: arm raised forward (`90` = straight ahead, `180` = overhead). Negative = arm behind |
| `armYaw` | arm moves in the side plane | arm swings out to the side (`90` = pointing at the viewer). Used for flyes and face pulls; the true 3D length stays constant |
| `elbow` | straight | bent (forearm folds forward/up) |
| `hip` | thigh in line with torso | flexion: thigh forward (`90` = seated) |
| `knee` | straight | bent (shin folds back) |
| `ankle` | foot at 90° to shin | toes point down (calf raise). Negative = toes up (tibialis raise) |

- `far` limbs default to the `near` values; give only the angles that differ.
- Position: give either `root: [x, y]` (hip position) or `anchor` to pin one joint (`hip, shoulder, head, elbow, hand, knee, ankle, heel, toe`, optional `side: "far"`) to a point. Anchors are the easy way to keep feet planted: for a flat foot, set `ankle = hip - torso - knee` (the shin's angle).
- Limb lengths are fixed (torso 44, upper arm 25, forearm 23, thigh 32, shin 31, foot 15), so limbs never stretch.

### Equipment

| `kind` | Placement fields | Draws |
|---|---|---|
| `bench` | `at`, `to` (seat top, left/right) | pad with legs |
| `seat` | `at`, `size` | seat on a post |
| `backpad` | `at`, `to` | thick angled pad |
| `pad` | `at` or `attach`, `angle`, `size` | small roller/chest pad |
| `frame` | `at`, `to` | machine frame bar |
| `legpress` | `attach: "foot"`, `from`, `to` (rail) | sled footplate with plate, following the feet |
| `pulley` | `at` | pulley wheel on a column |
| `cable` | `from` (pulley point), `attach: "hand"` | cable line that follows the hand |
| `handle` / `bar` | `attach: "hand"` | D-handle / bar |
| `dumbbell` | `attach: "hand"`, `size` | dumbbell |
| `wall` | `at` (x = wall face) | wall |
| `step` | `at`, `size` | step block |
| `mat` | `at`, `to` (x range) | floor mat |
| `plate` | `at` (top of stack) | weight stack |

`attach` options: `hand, elbow, foot, toe, knee, hip, chest, shoulder` (with optional `side: "far"`); `at` then acts as an offset.

## Full example: a new exercise

```json
{
  "exercises": [{
    "id": "bodyweight-squat",
    "name": "Bodyweight squat",
    "equipment": ["bodyweight"],
    "muscles": { "primary": ["quads", "glutes"], "secondary": ["adductors", "abs"] },
    "cues": ["Feet shoulder-width", "Sit back and down, chest tall", "Drive up through mid-foot"],
    "defaultReps": "12-15",
    "animation": {
      "view": "side", "loop": "cycle", "equipment": [],
      "keyframes": [
        { "name": "Stand up", "durationMs": 1200, "pose": { "torso": 0, "near": { "shoulder": 0, "hip": 0, "knee": 0, "ankle": 0 }, "anchor": { "joint": "toe", "at": [140, 149] } } },
        { "name": "Sit down", "durationMs": 1600, "pose": { "torso": 32, "near": { "shoulder": 110, "hip": 114, "knee": 116, "ankle": -34 }, "anchor": { "joint": "toe", "at": [140, 149] } } }
      ]
    }
  }]
}
```
