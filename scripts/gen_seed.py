"""Authoring helper: writes src/data/exercises.json and src/data/routines.json.
Edit poses here, rerun `python3 scripts/gen_seed.py`, then check `npm run preview-anim`."""
import json, os
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data")
FLOOR = 152
SOLE = FLOOR - 3  # foot line sits just above the floor

def P(torso, near, far=None, root=None, anchor=None, neck=None):
    p = {"torso": torso, "near": near}
    if far is not None: p["far"] = far
    if root is not None: p["root"] = root
    if anchor is not None: p["anchor"] = anchor
    if neck is not None: p["neck"] = neck
    return p

def A(joint, x, y, side=None):
    a = {"joint": joint, "at": [x, y]}
    if side: a["side"] = side
    return a

def K(name, ms, pose, ease="inOut"):
    k = {"name": name, "durationMs": ms, "pose": pose}
    if ease != "inOut": k["ease"] = ease
    return k

def anim(equipment, keyframes, loop="cycle", alternate=False):
    a = {"view": "side", "equipment": equipment, "keyframes": keyframes, "loop": loop}
    if alternate: a["alternateSides"] = True
    return a

def ex(id, name, equipment, primary, secondary, cues, reps, animation, notes=None, hold=None):
    e = {"schemaVersion": 1, "id": id, "name": name, "equipment": equipment,
         "muscles": {"primary": primary, "secondary": secondary}, "cues": cues,
         "defaultReps": reps, "animation": animation}
    if notes: e["notes"] = notes
    if hold: e["holdSeconds"] = hold
    return e

E = []

# 1 Leg press: reclined seat, 45 degree sled. Feet stay flat on the plate (foot angle 220 abs).
lp_seat = {"kind": "backpad", "at": [36, 108], "to": [78, 136]}
def lp(thigh, knee):
    t = -55
    shin = thigh - knee
    return P(t, {"shoulder": 25, "elbow": 35, "hip": thigh + t, "knee": knee, "ankle": shin - 130}, {"hip": thigh + t - 4, "knee": knee}, root=[84, 128])
E.append(ex("leg-press", "Leg press", ["machine"], ["quads", "glutes"], ["hamstrings", "adductors", "calves"],
  ["Feet shoulder-width, middle of the plate", "Lower until knees are about 90°, push through heels", "Do not lock your knees at the top"],
  "10–12",
  anim([lp_seat, {"kind": "frame", "at": [70, 140], "to": [70, FLOOR]}, {"kind": "frame", "at": [40, 120], "to": [40, FLOOR]},
        {"kind": "legpress", "attach": "foot", "at": [2, 2], "from": [112, 128], "to": [204, 50]}],
       [K("Push", 1200, lp(135, 10)), K("Lower", 1700, lp(176, 92)), K("Pause", 300, lp(176, 92))])))

# 2 Seated cable row
def row(t, s, el):
    return P(t, {"shoulder": s, "elbow": el, "hip": 88 + t, "knee": 28, "ankle": -18}, {"shoulder": s + 2, "elbow": el}, root=[78, 128])
E.append(ex("seated-cable-row", "Seated cable row", ["cable"], ["lats", "upper_back"], ["rear_delts", "biceps", "forearms"],
  ["Chest tall, pull the handle to your belly button", "Squeeze shoulder blades together, 1-second pause", "Return slowly without rounding forward"],
  "10–12",
  anim([{"kind": "bench", "at": [52, 134], "to": [180, 134]}, {"kind": "pad", "at": [150, 120], "angle": 70},
        {"kind": "pulley", "at": [226, 104]}, {"kind": "cable", "attach": "hand", "from": [226, 104]}, {"kind": "handle", "attach": "hand"}],
       [K("Return", 1600, row(14, 82, 4)), K("Pull", 1000, row(-4, -38, 118)), K("Squeeze", 700, row(-4, -40, 120))])))

# 3 Pec deck: arm yaw sweeps the arms from out to the side (foreshortened) to in front.
def pec(yaw, el):
    return P(0, {"shoulder": 82, "armYaw": yaw, "elbow": el, "hip": 90, "knee": 88, "ankle": -2}, {"hip": 86, "knee": 84}, root=[86, 118])
E.append(ex("pec-deck", "Pec deck (chest fly machine)", ["machine"], ["chest"], ["front_delts"],
  ["Back flat on the pad, slight bend in the elbows", "Bring the pads together in front of your chest", "Do not let arms go far back at the stretch (left shoulder)"],
  "10–12",
  anim([{"kind": "seat", "at": [88, 125]}, {"kind": "backpad", "at": [76, 120], "to": [76, 64]}, {"kind": "frame", "at": [64, 20], "to": [64, FLOOR]},
        {"kind": "frame", "at": [64, 22], "to": [100, 22]}, {"kind": "pad", "attach": "hand", "angle": 90, "size": 0.9}],
       [K("Open", 1700, pec(68, 18)), K("Squeeze", 1200, pec(0, 18)), K("Hold", 500, pec(0, 18))]),
  notes="Keep a slight elbow bend and avoid a deep stretch behind the body (sensitive left shoulder)"))

# 4 Lat pulldown
def lat(t, s, el):
    return P(t, {"shoulder": s, "elbow": el, "hip": 90 + t, "knee": 85, "ankle": -5}, {"shoulder": s, "elbow": el, "hip": 86 + t, "knee": 82}, root=[90, 120])
E.append(ex("lat-pulldown", "Lat pulldown", ["cable", "machine"], ["lats"], ["biceps", "rear_delts", "upper_back"],
  ["Lean back slightly, pull the bar to your upper chest", "Drive elbows down toward your ribs", "Control the bar on the way up"],
  "10–12",
  anim([{"kind": "seat", "at": [90, 127]}, {"kind": "pad", "at": [120, 106], "angle": 0, "size": 1.0}, {"kind": "frame", "at": [138, 106], "to": [138, FLOOR]},
        {"kind": "frame", "at": [138, 4], "to": [138, 106]}, {"kind": "pulley", "at": [111, 6]},
        {"kind": "cable", "attach": "hand", "from": [111, 6]}, {"kind": "bar", "attach": "hand"}],
       [K("Return", 1600, lat(-4, 166, 10)), K("Pull", 1100, lat(-14, 22, 132)), K("Squeeze", 500, lat(-14, 20, 134))])))

# 5 Dumbbell Romanian deadlift: toe pinned, arms hang vertically.
def rdl(t, thigh, knee):
    shin = thigh - knee
    return P(t, {"shoulder": t, "elbow": 0, "hip": thigh + t, "knee": knee, "ankle": shin}, anchor=A("toe", 134, SOLE))
E.append(ex("dumbbell-romanian-deadlift", "Dumbbell Romanian deadlift", ["dumbbell"], ["hamstrings", "glutes"], ["lower_back", "forearms", "traps"],
  ["Soft knees, push hips straight back", "Dumbbells slide along your thighs, back flat", "Stand up by squeezing your glutes"],
  "10",
  anim([{"kind": "dumbbell", "attach": "hand"}],
       [K("Stand", 1300, rdl(0, 0, 6)), K("Hinge", 1800, rdl(72, 18, 24)), K("Pause", 300, rdl(72, 18, 24))])))

# 6 Plank: elbows pinned, gentle brace.
def plank(t, hip):
    return P(t, {"shoulder": t, "elbow": 92, "hip": hip, "knee": 0, "ankle": 10}, {"shoulder": t, "elbow": 92, "hip": hip}, anchor=A("elbow", 176, 142))
E.append(ex("plank", "Plank", ["bodyweight"], ["abs"], ["obliques", "glutes", "front_delts", "lower_back"],
  ["Elbows under shoulders, body in one straight line", "Squeeze glutes and abs, keep breathing", "Hold, do not let hips sag"],
  "30 sec hold",
  anim([{"kind": "mat", "at": [20, 0], "to": [214, 0]}],
       [K("Brace", 1600, plank(79, 0)), K("Breathe", 1600, plank(80, -2))], loop="pingpong"),
  hold=30))

# 7 Standing calf raise: toe pinned, 3 s up, pause, 3 s down.
def calf(ank):
    return P(0, {"shoulder": 4, "elbow": 6, "hip": 0, "knee": 2, "ankle": ank}, anchor=A("toe", 134, SOLE))
E.append(ex("standing-calf-raise", "Standing calf raise", ["bodyweight", "dumbbell"], ["calves"], [],
  ["Slow: 3 seconds up, 3 seconds down", "Full range, pause at the top", "Bodyweight first, add dumbbells once 2×15 feels easy"],
  "12–15 slow",
  anim([], [K("Lower", 3000, calf(0)), K("Rise", 3000, calf(38)), K("Pause", 800, calf(38)), K("Lower", 3000, calf(0)), K("Pause", 400, calf(0))]),
  notes="Slow tempo, bodyweight first"))

# 8 Tibialis raise: back on the wall, heel pinned, 3 s up, 3 s down.
def tib(ank):
    return P(-13, {"shoulder": -10, "elbow": 8, "hip": 0, "knee": 0, "ankle": ank}, {"shoulder": -14, "elbow": 8}, anchor=A("heel", 112, SOLE))
E.append(ex("tibialis-raise", "Tibialis raise", ["bodyweight", "wall"], ["tibialis"], [],
  ["Back against a wall, heels about 30 cm out", "Lift your toes toward your shins, slowly", "Sharp or lingering shin pain: go lighter"],
  "12–15 slow",
  anim([{"kind": "wall", "at": [79, 0]}],
       [K("Lower", 3000, tib(13)), K("Lift toes", 3000, tib(-24)), K("Pause", 600, tib(-24)), K("Lower", 3000, tib(13)), K("Pause", 400, tib(13))]),
  notes="Sharp or lingering shin pain means go lighter"))

# 9 Goblet squat
def gob(t, thigh, knee, s):
    shin = thigh - knee
    return P(t, {"shoulder": s, "elbow": 135, "hip": thigh + t, "knee": knee, "ankle": shin}, anchor=A("toe", 140, SOLE))
E.append(ex("goblet-squat", "Goblet squat", ["dumbbell"], ["quads", "glutes"], ["adductors", "abs", "upper_back"],
  ["Dumbbell held at your chest, elbows inside your knees", "Sit down between your hips, chest tall", "Drive up through the middle of your foot"],
  "10–12",
  anim([{"kind": "dumbbell", "attach": "hand", "at": [3, -3], "size": 1.15}],
       [K("Stand", 1300, gob(0, 0, 0, 22)), K("Sit down", 1800, gob(32, 82, 116, 52)), K("Pause", 300, gob(32, 82, 116, 52))])))

# 10 Chest-supported row
def csr(s, el):
    return P(38, {"shoulder": s, "elbow": el, "hip": 116, "knee": 82, "ankle": 0}, {"shoulder": s + 3, "elbow": el, "hip": 112, "knee": 78}, root=[80, 111])
E.append(ex("chest-supported-row", "Chest-supported row machine", ["machine"], ["upper_back", "lats"], ["rear_delts", "biceps"],
  ["Chest firmly on the pad", "Pull elbows back, squeeze shoulder blades", "Do not shrug"],
  "10–12",
  anim([{"kind": "seat", "at": [76, 118]}, {"kind": "backpad", "at": [120, 64], "to": [108, 98]}, {"kind": "frame", "at": [110, 98], "to": [110, FLOOR]},
        {"kind": "frame", "at": [150, 40], "to": [150, FLOOR]}, {"kind": "handle", "attach": "hand"}],
       [K("Return", 1600, csr(68, 4)), K("Pull", 1000, csr(-6, 104)), K("Squeeze", 700, csr(-8, 106))])))

# 11 Cable chest fly: split stance, cable from a high pulley behind.
def fly(yaw, s):
    return P(10, {"shoulder": s, "armYaw": yaw, "elbow": 20, "hip": 22, "knee": 14, "ankle": -2}, {"hip": -12, "knee": 4, "ankle": -26}, anchor=A("toe", 146, SOLE))
E.append(ex("cable-chest-fly", "Cable chest fly", ["cable"], ["chest"], ["front_delts"],
  ["Slight bend in the elbows, kept the same all the way", "Hug a big tree: hands meet in front of your chest", "Do not let arms drift far behind you"],
  "10–12",
  anim([{"kind": "pulley", "at": [44, 20]}, {"kind": "cable", "attach": "hand", "from": [44, 20]}, {"kind": "handle", "attach": "hand"}],
       [K("Open", 1700, fly(70, 98)), K("Hug", 1200, fly(0, 78)), K("Squeeze", 500, fly(0, 76))]),
  notes="Keep a slight elbow bend and avoid a deep stretch behind the body (sensitive left shoulder)"))

# 12 Face pull
def fp(s, yaw, el):
    return P(-6, {"shoulder": s, "armYaw": yaw, "elbow": el, "hip": 8, "knee": 6, "ankle": 2}, {"hip": -14, "knee": 4, "ankle": -20}, anchor=A("toe", 128, SOLE))
E.append(ex("face-pull", "Face pull (cable)", ["cable"], ["rear_delts", "upper_back"], ["traps", "biceps"],
  ["Cable at face height, rope handles", "Pull toward your face, elbows high and wide", "Squeeze rear shoulders, return slowly"],
  "12–15",
  anim([{"kind": "pulley", "at": [226, 46]}, {"kind": "cable", "attach": "hand", "from": [226, 46]}, {"kind": "handle", "attach": "hand"}],
       [K("Return", 1600, fp(84, 0, 4)), K("Pull", 1000, fp(96, 62, 118)), K("Squeeze", 700, fp(97, 64, 120))])))

# 13 Glute bridge: heel pinned, shoulders stay on the floor.
def br(t, thigh, knee, s):
    shin = thigh - knee
    return P(t, {"shoulder": s, "elbow": 0, "hip": thigh + t, "knee": knee, "ankle": shin}, anchor=A("heel", 158, SOLE))
E.append(ex("glute-bridge", "Glute bridge (or hip thrust)", ["bodyweight"], ["glutes"], ["hamstrings", "abs"],
  ["Feet flat, hip-width, heels under knees", "Push hips up, squeeze glutes at the top", "Lower slowly, do not arch your lower back"],
  "10–12",
  anim([{"kind": "mat", "at": [20, 0], "to": [214, 0]}],
       [K("Lower", 1700, br(-90, 135, 100, 0)), K("Lift", 1100, br(-112, 112, 106, -22)), K("Squeeze", 800, br(-112, 112, 106, -22))])))

# 14 Dead bug: opposite arm and leg, alternates every rep.
TAB = {"shoulder": 90, "elbow": 0, "hip": 90, "knee": 90, "ankle": 10}
def db(near, far):
    return P(-90, {**TAB, **near}, {**TAB, **far}, root=[118, 141])
E.append(ex("dead-bug", "Dead bug", ["bodyweight"], ["abs"], ["obliques", "hip_flexors"],
  ["Lower back pressed into the floor", "Slowly extend the opposite arm and leg", "Alternate sides, 10 per side"],
  "10 per side",
  anim([{"kind": "mat", "at": [20, 0], "to": [214, 0]}],
       [K("Return", 1300, db({}, {})), K("Extend", 1700, db({"shoulder": 172}, {"hip": 12, "knee": 4, "ankle": 30})),
        K("Pause", 400, db({"shoulder": 172}, {"hip": 12, "knee": 4, "ankle": 30}))], alternate=True)))

json.dump(E, open(os.path.join(OUT, "exercises.json"), "w"), indent=1, ensure_ascii=False)

WARM = {"type": "text", "title": "Warm-up", "icon": "bike", "lines": ["Bike ride to the gym (10 min)", "Arm circles, 1 min", "Band pull-aparts, 1×15"]}
FIN = {"type": "text", "title": "Finisher", "icon": "stairs", "lines": ["Stairmaster or incline walk, 8–10 min", "Easy to moderate pace", "Bike ride home is your cooldown"]}
def b(id, reps=None, sets="phase"):
    x = {"type": "exercise", "exerciseId": id, "sets": sets}
    if reps: x["reps"] = reps
    return x
R = [{"schemaVersion": 1, "id": "full-body-ab", "name": "Full body A/B", "sessions": [
  {"id": "a", "name": "Session A", "blocks": [WARM, b("leg-press", "10–12"), b("seated-cable-row", "10–12"), b("pec-deck", "10–12"), b("lat-pulldown", "10–12"),
     b("dumbbell-romanian-deadlift", "10"), b("plank", "30 sec hold"), b("standing-calf-raise", "12–15 slow", 2), b("tibialis-raise", "12–15 slow", 2), FIN]},
  {"id": "b", "name": "Session B", "blocks": [WARM, b("goblet-squat", "10–12"), b("chest-supported-row", "10–12"), b("cable-chest-fly", "10–12"), b("face-pull", "12–15"),
     b("glute-bridge", "10–12"), b("dead-bug", "10 per side"), b("standing-calf-raise", "12–15 slow", 2), b("tibialis-raise", "12–15 slow", 2), FIN]},
]},
 {"schemaVersion": 1, "id": "cardio-days", "name": "Cardio days", "sessions": [
  {"id": "incline-walk", "name": "Incline walk", "blocks": [
    {"type": "text", "title": "Warm-up", "lines": ["Easy walk on the treadmill, 5 min"]},
    {"type": "text", "title": "Incline walk", "icon": "stairs", "lines": ["Incline 8–12%, speed 4.5–5.5 km/h, 30–40 min", "Breathing harder but you can still talk", "Do not hold the handrails"]},
    {"type": "text", "title": "Cool-down", "lines": ["Flat walk, 5 min", "Stretch calves and hips"]}]},
  {"id": "stairs-intervals", "name": "Stairs", "blocks": [
    {"type": "text", "title": "Warm-up", "lines": ["Easy stairmaster pace, 5 min"]},
    {"type": "text", "title": "Intervals", "icon": "stairs", "lines": ["1 min faster, 2 min easy, repeat 6–8 times", "Stand tall, light hands on the rails"]},
    {"type": "text", "title": "Cool-down", "lines": ["Easy pace, 5 min"]}]},
  {"id": "walk-outdoors", "name": "Long walk", "blocks": [
    {"type": "text", "title": "Brisk walk", "lines": ["45–60 min outdoors at a brisk pace", "Hills are a bonus"]}]},
  {"id": "swim-or-elliptical", "name": "Swim or elliptical", "blocks": [
    {"type": "text", "title": "Steady cardio", "lines": ["Swim or elliptical, 30–40 min", "Moderate pace you can hold the whole time"]}]},
 ]}]
json.dump(R, open(os.path.join(OUT, "routines.json"), "w"), indent=1, ensure_ascii=False)
print("wrote", len(E), "exercises")
