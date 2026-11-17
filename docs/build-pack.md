# Build pack: workout app, "Obsidian Horology" redesign

For the developer. This file is self-contained: you have not seen the design conversation. Build exactly this.

**The app**

- A React PWA for Android Chrome. It works fully offline, has one user (Avi), and all data stays on the phone.
- Avi is non-technical. Explain choices to him in plain English.

**Bundled with this file**

- `svg/icons/`: 44 files. `svg/brand/`: 9 files.
- `screens/*.png`: renders of every screen, component sheet, brand sheet and the motion board.
- The design canvas, which is private to Avi: https://claude.ai/artifact/RPEjmbBfT7jVrtqXENbCAb

**How to read the screenshots**

- They are the visual source of truth. If this file and a screenshot disagree, follow this file.
- Screens are drawn at their full scrolled length. A dashed line marks the bottom of a 390 × 844 phone screen.

**The concept in one line:** the app is a fine watch at night. Progress is a dial with a gold bezel, exercises are numbered like hour markers (I–VIII), numbers sit in recessed watch windows, and amethyst "lume" glows only on things you can tap.

---

## 1. Design tokens

Dark only for now.

```css
:root {
  /* ---------- Ground & atmosphere ---------- */
  --obsidian: #07060A;                       /* app ground */
  --obsidian-deep: #050407;                  /* splash, icon */
  --stage: #030205;                          /* behind sheets only */
  --atmos: radial-gradient(560px 560px at -10% -8%, rgba(124,82,255,0.42) 0%, rgba(124,82,255,0) 65%),
           radial-gradient(460px 460px at 112% 42%, rgba(214,170,255,0.13) 0%, rgba(214,170,255,0) 65%),
           #07060A;                          /* every screen background */
  --grain-opacity: 0.13;                     /* fractal-noise overlay, mix-blend-mode: overlay (see §2.0) */

  /* ---------- Surfaces ---------- */
  --glass: linear-gradient(160deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02));
  --glass-border: rgba(255,255,255,0.12);
  --glass-highlight: inset 0 1px 0 rgba(255,255,255,0.14);
  --glass-shadow: 0 24px 48px rgba(0,0,0,0.45);
  --glass-fallback: #110E17;                 /* solid fallback, low-power or no backdrop support */
  --sheet: #0D0A13;                          /* exercise sheet; + radial amethyst glow at top */
  --tabbar: rgba(12,10,16,0.82);
  --toast: rgba(20,16,28,0.92);
  --window: #050408;                         /* recessed inputs and the weight window */
  --window-inset: inset 0 4px 14px rgba(0,0,0,0.9);
  --dial-face: radial-gradient(circle at 50% 35%, #1D1628 0%, #0C0A10 75%);
  --guilloche: repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0 1px, transparent 1px 5px);

  /* ---------- Lines ---------- */
  --hair: rgba(255,255,255,0.07);            /* list row dividers */
  --hair-strong: rgba(255,255,255,0.14);     /* button and input borders */
  --hair-gold: rgba(227,201,143,0.35);       /* section top rules */
  --hair-gold-done: rgba(227,201,143,0.28);  /* done row divider */

  /* ---------- Ink ---------- */
  --ink-1: #F1ECF7;     /* 17.9:1 on obsidian */
  --ink-2: #A39BB3;     /* 7.6:1, meta and labels */
  --ink-3: #7D748F;     /* 4.6:1, done rows, captions, units */
  --ink-4: #5E566E;     /* non-text only: "/8" in dial, equipment lines */
  --ink-on-accent: #120A22;  /* text on amethyst (5.3:1) and on gold */

  /* ---------- Amethyst: action + lume (the only thing that glows) ---------- */
  --amethyst: #8B6CFF;                       /* primary buttons, filled ticks, active segment */
  --amethyst-chart: #9575FF;                 /* chart line, muscle-map primary (passed the dataviz lightness and contrast checks on #0C0A10) */
  --lume: #C9B4FF;                           /* active icons, links, figure limbs, "Or:" line */
  --amethyst-22: rgba(139,108,255,0.22);     /* selected chip or segment fill */
  --amethyst-border: rgba(201,180,255,0.55); /* selected chip or segment border */
  --glow-primary: 0 0 28px rgba(139,108,255,0.5), inset 0 1px 0 rgba(255,255,255,0.35);
  --glow-tick: 0 0 14px rgba(139,108,255,0.65);
  --glow-select: 0 0 18px rgba(139,108,255,0.35);

  /* ---------- Champagne gold: achievement + metal ---------- */
  --gold: #E3C98F;                           /* 12.6:1; totals, streaks, done numerals, dial, bezel */
  --gold-sheen: linear-gradient(110deg, #F6E7BF 0%, #E3C98F 50%, #A8884A 100%);
  --gold-dial: linear-gradient(135deg, #F6E7BF, #E3C98F 50%, #A8884A);  /* SVG linearGradient x1=0 y1=0 x2=1 y2=1 */
  --gold-07: rgba(227,201,143,0.07);         /* base/total box fill */
  --gold-30: rgba(227,201,143,0.30);         /* base/total box border */
  --glow-finish: 0 10px 30px rgba(227,201,143,0.30);

  --danger: #FF8A8A;  --danger-07: rgba(255,138,138,0.07);  --danger-30: rgba(255,138,138,0.30);
  /* Rule: amethyst = you can act; gold = you achieved. Never both on one element. */

  /* ---------- Type ---------- */
  --f-instrument: 'Michroma', sans-serif;    /* numbers, labels, buttons, titles (400 only) */
  --f-read: 'Inter Tight', sans-serif;       /* names and body (400/500/600/700) */
  --t-window:   46px/1 var(--f-instrument);  /* weight window */
  --t-dial:     42px/1 var(--f-instrument);  /* dial count; "/8" at 22px in --ink-4 */
  --t-title:    26px/1.2 var(--f-instrument);  /* screen titles, letter-spacing 3px, CAPS */
  --t-sheet:    700 28px/1.05 var(--f-read);   /* sheet title, letter-spacing -0.5px */
  --t-row:      600 18px/1.2 var(--f-read);    /* row name (done: 16px) */
  --t-body:     400 16px/1.45 var(--f-read);
  --t-meta:     400 13px/1.4 var(--f-read);
  --t-weight:   16px/1 var(--f-instrument);    /* row weight; unit 8px --ink-3 */
  --t-button:   10.5px/1 var(--f-instrument);  /* letter-spacing 2.5px, CAPS */
  --t-label:    9px/1.3 var(--f-instrument);   /* letter-spacing 2.5px, CAPS, --ink-2 */
  --t-tab:      6.5px/1 var(--f-instrument);   /* letter-spacing 0.6px, CAPS */
  /* Michroma is wide: keep labels short. Sentence case for sentences; CAPS only for Michroma labels and buttons. */

  /* ---------- Space & shape ---------- */
  --s-4: 4px; --s-8: 8px; --s-12: 12px; --s-16: 16px; --s-24: 24px; --s-32: 32px;
  --edge: 24px;                 /* screen side padding */
  --touch: 48px;
  --r-inner: 18px;              /* windows, inner boxes, caution */
  --r-panel: 28px;              /* glass panels, animation frame */
  --r-sheet: 32px;              /* sheet top corners */
  --r-pill: 999px;              /* all buttons, chips, segments, tab bar */

  /* ---------- Motion ---------- */
  --ease-enter: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-exit:  cubic-bezier(0.4, 0, 1, 1);
  --ease-press: cubic-bezier(0.34, 1.56, 0.64, 1);
  --dur-reduced: 150ms;
}
```

---

## 2. Component specs

### 2.0 Screen shell

- Every screen is a 390-wide column with `--atmos` as its background, plus a grain overlay.
- **Grain overlay:** an absolutely positioned SVG covering the screen, `opacity: 0.13; mix-blend-mode: overlay; pointer-events: none`, containing `<filter><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/></filter>` applied to a full rect.
  - Render it once, fixed behind the content. Do not render it per card.
  - In low-power mode or with `prefers-reduced-transparency`, drop it.
- **Padding:** 24 at the sides, 24 at the top. Leave about 100 px at the bottom so content can scroll above the floating tab bar.
- No fake status bar. Respect the safe-area insets.

### 2.1 Dial (signature component)

Size 280 × 280 on Home (230 on the component sheet), built in a 280 × 280 viewBox. Layers, back to front:

1. **Face:** a circle with 74.2% diameter, centred. Background is `--guilloche` over `--dial-face`, with an inset shadow `inset 0 2px 10px rgba(0,0,0,0.7)` and a `0 0 0 1px rgba(255,255,255,0.05)` ring.
2. **Bezel:** a circle of r 137, stroke `--gold-dial` at 1.2 px. Opacity 0.7, or 1 when all are done.
3. **Minute marks:** 60 radial ticks.
   - Hour marks (every 5th) run r 128 → 120, at 1.6 px, `rgba(241,236,247,0.55)`.
   - The others run r 128 → 124, at 1 px, `rgba(241,236,247,0.22)`.
4. **Segments:** 8 arcs at r 108, stroke width 9, butt caps. Segment *i* spans from (i·45 + 3)° to ((i+1)·45 − 3)°, measured clockwise from 12 o'clock.
   - To do: `rgba(255,255,255,0.08)`.
   - Done: `--gold-dial`, plus a blurred copy underneath (feGaussianBlur stdDeviation 4) at opacity 0.5 (0.9 when all are done).
   - Segments fill in checklist order: the count fills from 12 o'clock, regardless of which exercise was ticked.
5. **Lume dot:** marks the next segment. A centre dot at the segment's middle angle at r 108, r 3.5, `--lume`, over a blurred `--amethyst` dot of r 7. Hide it when all are done.
6. **Text** (centre):
   - "GYM DAY": `--t-label`, `--ink-2`, at y 112.
   - The count: `--t-dial`, `--ink-1` (gold when all are done), with "/8" at 22 px in `--ink-4`.
   - The sub-line at y 186: Inter Tight 13 px, `--ink-2`. "about 48 min" / "That's the lot" / "Session saved".
   - **Logged state:** the count becomes "LOGGED" (Michroma 24, gold) and every segment is gold.
7. **Accessibility:** `role="img"`, aria-label "3 of 8 exercises done" / "Session logged".

### 2.2 Week strip (under the dial)

- A centred row, gap 18. Michroma 9 px, letter-spacing 2 px.
- **Done day:** an 8 px gold dot with `0 0 10px rgba(227,201,143,0.6)` and the day name in gold.
- **To-do day:** an 8 px hollow dot (1 px `--ink-2`) and the day name in `--ink-2`.
- Then a 1 × 12 px divider, then the streak: a 12 px gold flame icon and "4-WEEK STREAK" in gold.
- Below, centred, the status line in Inter Tight 15 px: `--ink-2`, or gold when all are done.
- Day state is never shown by colour alone: the dot is filled or hollow.

### 2.3 Checklist row

- **Grid:** columns 30 px / 1fr / auto / 48 px, column gap 10, min-height 72, padding 8 0 8 4, bottom border 1 px `--hair`. No card background.
- **Columns:**
  1. The Roman numeral (I–VIII): Michroma 10, `--ink-3`.
  2. The name in `--t-row` `--ink-1`, then the meta line in `--t-meta` `--ink-2`, with any total appended in gold ("40 kg plates · ≈ 80 kg").
     - The shoulder either/or row adds a third line in Inter Tight 12, `--lume`: a 13 px switch icon and "Or: Shoulder press machine". Tapping it swaps the exercise.
  3. The weight in `--t-weight` `--ink-1`, with the unit "KG" at 8 px `--ink-3`. Stack weights have no unit.
  4. The tick button: a 48 × 48 hit area holding a 26 px ring (1.5 px `--ink-2`).
- **Pressed:** background `rgba(255,255,255,0.05)`, radius 14, `scale(0.98)`.
- **Done:**
  - Min-height 60, divider `--hair-gold-done`.
  - The numeral turns `--gold`.
  - The name drops to 16 px, `--ink-3`, line-through. The meta line becomes the short form ("stack 45", "≈ 60 kg") in `--ink-3`. The weight turns `--ink-3`.
  - The tick ring becomes a filled `--amethyst` circle with a 14 px tick in `--ink-on-accent` (stroke 3) and `--glow-tick`.
- **PB tag:** shown on done rows that beat the previous best. Absolutely positioned top 6, right 54. Michroma 7 px, letter-spacing 1.5, `--ink-on-accent` on `--gold-sheen`, radius 4, padding 2 5.
- **Tap targets:** the ring toggles done; the rest of the row opens the sheet. Ring aria-label: "Mark done: {name}" / "Mark not done: {name}".

### 2.4 Buttons

All buttons are pills.

| Type | Height | Background | Text | Effect / rules |
|---|---|---|---|---|
| Primary | 58–60 | `--amethyst` | `--ink-on-accent`, `--t-button` | `--glow-primary`. Pressed: `#7A5CF0`, scale 0.97. |
| Finish | 58 | `--gold-sheen` | ink | `--glow-finish`. Only when every exercise is done; before that, "FINISH WORKOUT" uses Secondary. |
| Secondary | 58 (48 inside panels) | `rgba(255,255,255,0.05)` | `--ink-1` | 1 px `rgba(255,255,255,0.16)` border, inset top highlight |
| Disabled | 48–58 | `rgba(255,255,255,0.04)` | `--ink-3` | no border |
| Danger | 48 | transparent | `--danger` | 1 px `rgba(255,138,138,0.4)` border |
| Link | min-height 48 | none | Inter Tight 13–14, `--lume` | underline, 3 px offset |
| Round step (weight) | 60 × 60 circles | Minus: `rgba(255,255,255,0.05)`; Plus: `--amethyst` | Minus: `--ink-1` icon; Plus: ink icon | Minus: hairline-strong border. Plus: `0 0 22px rgba(139,108,255,0.55)` glow. |

### 2.5 Segmented switch and filter chips

- **Segmented track:** padding 4, pill, `rgba(255,255,255,0.04)` fill, 1 px `rgba(255,255,255,0.10)` border.
- **Segments:** 42 tall, Michroma 8.5, letter-spacing 1.5.
  - Selected: `--amethyst-22` fill, `--amethyst-border`, `--glow-select`, `--ink-1` text.
  - Unselected: `--ink-2` text.
  - Used for the shoulder switch (Lateral raise | Shoulder press) and the Theme setting (System | Light | Dark).
- **Filter chips:** height 36, pill, Michroma 8, letter-spacing 1.5.
  - Off: `rgba(255,255,255,0.03)` fill, `rgba(255,255,255,0.12)` border, `--ink-2` text.
  - On: same as a selected segment.
- **Gym-day toggles (Settings):** 7 circles of 48 px. On: `--amethyst` with ink text and a glow. Off: an off chip. Use `aria-pressed`.

### 2.6 Glass panel

- Radius 28, padding 18–20.
- Background `--glass`, 1 px `--glass-border`, box-shadow `--glass-highlight, --glass-shadow`.
- Optional `backdrop-filter: blur(24px)`. Fallback: `--glass-fallback`.
- Use panels only for things you act on: the weight field, measurements, import, backup, charts, the saved card, the muscle map. Lists are always hairline rows, never cards.

### 2.7 Tab bar

- Size 342 × 66, floating 10 px above the bottom, centred. Pill, `--tabbar`, 1 px `rgba(255,255,255,0.10)` border.
- Shadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 16px 40px rgba(0,0,0,0.55)`.
- **5 tabs:** HOME, ROUTINES, LIBRARY, PROGRESS, SETTINGS. Each is min-width 60, with a 22 px icon (stroke 1.6) over a `--t-tab` label.
- **Inactive:** icon and label `--ink-2`.
- **Active:** icon `--lume` with the gold node lit, label `--ink-1`, and a 44 × 32 pill behind the icon (`rgba(139,108,255,0.20)`, `0 0 18px rgba(139,108,255,0.35)`).

### 2.8 Toast

- Padding 12 18, pill, `--toast`, 1 px `--hair-strong`, Inter Tight 14 `--ink-1`.
- Centred above the tab bar. Shows "Press back again to exit".

### 2.9 Saved card (replaces Finish after saving)

- A glass panel with a `rgba(227,201,143,0.45)` border, gap 14.
- **Contents:**
  - "SESSION LOGGED" (`--t-label`, gold).
  - "Two for two this week." (Inter Tight 600 20).
  - "52 min · 8 exercises · 1 new best" (13 px `--ink-2`). These are real values from the session.
  - Secondary button, 48 tall: "BACK UP NOW".

### 2.10 Exercise sheet parts

- **Sheet:** a bottom sheet from top 52 to the bottom, with radius 32 on the top corners.
  - Background `radial-gradient(480px 360px at 50% 0%, rgba(124,82,255,0.30), transparent 70%), #0D0A13`, plus grain.
  - Top border 1 px `--hair-strong`, `0 -20px 60px rgba(0,0,0,0.6)`. Padding 10 22 28, gap 18.
  - Behind it, Home dims to 35% over `--stage`.
- **Header:** a 38 × 4 grab handle (`rgba(255,255,255,0.22)`). Below it, "I OF VIII" (`--t-label`) on the left and a 48 px glass close button on the right.
- **Animation frame:**
  - Radius 28, 1 px `--glass-border`, `inset 0 2px 14px rgba(0,0,0,0.7)`.
  - Background: guilloché centred below the frame (`repeating-radial-gradient(circle at 50% 120%, rgba(255,255,255,0.025) 0 1px, transparent 1px 6px)`) over `radial-gradient(circle at 50% 45%, rgba(139,108,255,0.22), transparent 62%), #0A0810`.
  - **Header row:** the phase label (Michroma 11, letter-spacing 3, `--lume`: SQUEEZE / PUSH / LOWER / RAISE / PULL) and a speed pill "1×" / "0.5×" (height 34).
  - **Footer row:** "Tap to pause" (12 px `--ink-3`), then START and END still-frame pills (height 32).
  - **Figure style** (the engine draws the frames; these are the strokes):

| Element | Stroke |
|---|---|
| Floor | `rgba(255,255,255,0.12)`, 1.5 px |
| Equipment | `#4E4760`, 4 px |
| Cables | `#5E566E`, 1.5 px, dashed 3 4 |
| Body | `--ink-1`, 5.5 px |
| Head | hollow, r 12, 4.5 px |
| Working limbs | `--lume` 5.5 px over a blurred `--amethyst` 10 px copy (stdDeviation 4, opacity 0.8) |
| Hand and contact points | `--gold` dots, r 4 |

- **Title row:** the name in `--t-sheet`, and a reps pill: height 30, 1 px `rgba(227,201,143,0.5)`, Michroma 9, gold, "3 × 10–12".
- **Weight panel** (glass, centred, gap 12):
  - Label in `--t-label`: NUMBER ON THE WEIGHT STACK / PLATES YOU ADDED · BOTH SIDES / DUMBBELL WEIGHT.
  - Control row: minus, the window, plus.
  - **Window:** flex 1, height 84, radius 18, `--window` fill, 1 px `rgba(227,201,143,0.45)` border, `--window-inset` plus a `0 0 0 4px rgba(255,255,255,0.03)` ring. The value is in `--t-window`, unit Michroma 10 `--ink-3`. 24 px fades top and bottom (`--window` → transparent) make the number roll like a watch date wheel.
  - Below: "LAST TIME · 40" in Michroma 8.5, `--ink-3`.
  - **New best:** the window border turns `--gold`, the value turns gold, a PB tag appears beside the value, and the window glows `0 0 24px rgba(227,201,143,0.25)`.
  - **Base/total box** (plate-loaded only): padding 12 14, radius 18, `--gold-07` fill, `--gold-30` border. On the left, "Olympic bar: 20 kg" (13 px `--ink-2`) over a link, "Change Olympic bar weight". On the right, "≈ 60 KG" in Michroma 20, gold. The leg press uses "Sled: 40 kg"; the EZ-bar curl uses "EZ bar: 10 kg".
- **Muscle panel** (glass, a horizontal row):
  - Two silhouettes, front and back, 66 × 120 each. Body fill `rgba(255,255,255,0.09)`.
  - Primary muscles: `--amethyst-chart` over a blurred `--amethyst` copy. Secondary: `--lume` at 45%.
  - On the right: "PRIMARY" with an 8 px swatch, the muscle name (16 px 600), then "ALSO" with a swatch and the muscles (14 px `--ink-2`). The names are always written out, never colour only. Tap to enlarge.
- **Cues:** rows with a 30 px numeral column (Michroma 9, gold: i / ii / iii), body text, and hairline dividers.
- **Caution:** radius 18, padding 12 14, `--danger-07` fill, `--danger-30` border, an 18 px warning triangle in `--danger`, 14 px text.
- **Primary button:** "MARK AS DONE", 60 tall, pinned at the bottom of the scroll.

### 2.11 Chart card (built to the dataviz skill's rules)

- A glass panel with a header: the title (17 px 600) and subtitle "Weekly average · kg" (12 px `--ink-2`) on the left; a toggle pill "SHOW TABLE" / "SHOW CHART" (height 34) on the right.
- **Plot:** 294 × 168.
  - One series, one y-axis, no legend: the title names the series.
  - Three clean y ticks (82 / 84 / 86 for kg; 92 / 94 / 96 for cm) on solid 1 px gridlines in `#1E1A26`. Tick labels are 10 px `--ink-3`, left-aligned.
  - X captions "8 weeks ago" / "This week", 10 px `--ink-3`.
  - **Line:** 2 px `--amethyst-chart`, round caps and joins. Area under the line: the same colour at 10% opacity.
  - **End dot:** r 5, `--amethyst-chart`, with a 2 px ring in the card colour (`#110E17`). The direct label of the last value ("82.6 kg") sits above it in 12 px 600 `--ink-1`. Text never uses the series colour.
- **Interaction:**
  - An invisible hit column per week. On hover, touch or drag, show a 1 px `--ink-2` crosshair, a highlighted dot, and a tooltip ("Wk 6 · 83.1 kg"): `#1A1522`, 1 px `--hair-strong`, radius 10, clamped inside the card.
  - "Show table" replaces the plot with a two-column list of week and value.
  - Tapping a point is the same as hovering it.

---

## 3. Screen specs

### 3.1 Home (screenshot 01)

Top to bottom:

1. **Header:** 40 tall. "WED · 17 NOV" (`--t-label`) on the left; the small monogram (36 px) on the right.
2. **Dial** (2.1), centred, 4 px below the header.
3. **Week strip and status line** (2.2), 8 px below the dial. Status: "Your session is ready." / "Wednesday's still open." / "That's the lot." (gold) / "Two for two this week." (gold).
4. **Warm-up line:** 22 px gap above. "WARM-UP" (`--t-label`, gold, nowrap), then "Bike ride to the gym, arm circles, band pull-aparts" (13 px `--ink-2`). A bottom border in `--hair-gold`.
5. **"STILL TO DO"** label (18 px gap above), then the to-do rows (2.3). Hide both when the list is empty.
6. **Finish button:** 20 px gap above. Secondary until all are done, then Finish (gold). After saving, the saved card (2.9) replaces it.
7. **"DONE"** label, then the done rows. After saving, the done list is hidden (the dial says LOGGED).
8. **Tab bar** (Home active).

**States:**

| State | What shows |
|---|---|
| To do | 0 segments lit; lume dot on segment 1 |
| Partly | Done rows move down to the Done list; segments fill |
| All done | Gold count, glowing bezel, gold Finish button |
| Saved | Dial shows LOGGED; the Wed dot fills gold; streak → "5-WEEK STREAK"; saved card |

Ticks and weights persist until the day changes or the workout is finished.

### 3.2 Exercise sheet (screenshot 02)

Built from 2.10, top to bottom:

1. Handle.
2. "N OF VIII" and the close button.
3. The switch (shoulders only).
4. Animation frame.
5. Title and reps pill.
6. Weight panel.
7. Muscle panel.
8. Cues.
9. Caution, if present.
10. "MARK AS DONE".

Four content versions, with the muscles used in the mock-ups:

| Version | Exercise | Phase | Primary | Also | Caution |
|---|---|---|---|---|---|
| Stack | Lat pulldown | SQUEEZE | Lats | Biceps, rear shoulders | Shoulder |
| Plates + bar | Barbell bench press | PUSH | Chest | Front shoulders, triceps | Shoulder; base box shown |
| Dumbbell | Goblet squat | LOWER | Quads | Glutes | None |
| Shoulder switch | Cable lateral raise | RAISE | Side shoulders | Upper back | Shoulder |

### 3.3 Library (screenshot 03)

Top to bottom:

1. "9 EXERCISES" label, then the title "LIBRARY" (`--t-title`).
2. Search field: a glass pill, 52 tall, with an 18 px search icon. Placeholder "Search exercises".
3. Two rows of chips:
   - ALL / BACK / CHEST / LEGS / SHOULDERS / ARMS
   - ANY / CABLE / PLATES / DUMBBELL
4. The list, under a `--hair-gold` top rule, sorted A–Z. Each row is 66 tall:
   - a 40 px dial-style badge: a circle with a 1 px `rgba(227,201,143,0.35)` border and the dial face, holding a 20 px `--lume` glyph;
   - the name (17 px 600);
   - the meta in Michroma 8, `--ink-3` ("CABLE · LATS");
   - a chevron.
5. "HIDDEN EXERCISES (n)": dashed outline, 48 tall.
6. Tab bar.

**Detail view** (not drawn; reuse the sheet parts): a large animation frame, muscle panel, cues, notes, an equipment line, and a Secondary "HIDE" or "RESTORE" button.

### 3.4 Progress (screenshot 04, interactive on the canvas)

Top to bottom:

1. "TRAINING WEEK 05" label, then "PROGRESS".
2. This-week strip, between a gold top rule and a hairline: "THIS WEEK" on the left; MON and WED dots on the right.
3. **Recap panel:**
   - Fill `linear-gradient(150deg, rgba(227,201,143,0.14), rgba(255,255,255,0.02) 60%)`, border `rgba(227,201,143,0.38)`.
   - "[MONTH] RECAP" (gold label), then 3 stats in Michroma 24: sessions, new bests (gold), cm waist.
   - Bracketed values are placeholders: compute them from real data.
4. **Log today panel:** two recessed inputs side by side ("Weight (kg)", "Waist (cm)"; 54 tall, `--window`, Michroma 18 value), then the Primary button "SAVE TODAY'S ENTRY".
5. **Chart cards:** Body weight, then Waist (2.11).
6. **Progress photos row:** "Next photos in 12 days" with a Secondary button "TOOK THEM TODAY" (40 tall).
7. **Backup due row,** only when due: gold border, gold backup icon, "Keep a copy safe." / "Last backup 3 weeks ago", and a small Primary button "BACK UP".
8. **"HISTORY"**, then rows: the date (Michroma 18 day number over a 7.5 px month), "Gym day · 52 min", and "3 sets with weight logged · 8 exercises".
9. Tab bar.

### 3.5 Settings (screenshot 05)

Top to bottom:

1. "VERSION 2026-11-17" label, then "SETTINGS".
2. **Gym days:** 7 round toggles (Mon and Wed on), with "Monday and Wednesday" underneath.
3. **Theme:** the segmented switch, with Dark selected. Light is a later stage.
4. **Import panel:**
   - A recessed textarea ("Paste a routine pack here").
   - CHECK PACK and CHOOSE FILE side by side.
   - APPLY, disabled until the pack checks out.
   - A preview line.
5. **Backup panel:**
   - Primary "EXPORT ALL DATA". It opens the Android share sheet.
   - Helper text.
   - Danger "RESET TO DEFAULTS" (confirm first).
6. **Footer:** the 56 px monogram and "VERSION 2026-11-17".
7. Tab bar.

### 3.6 Splash (screenshot 14)

- `--obsidian-deep` with `radial-gradient(circle at 50% 44%, rgba(124,82,255,0.40), transparent 45%)` and grain.
- The monogram at 170 px. The "[NAME]" wordmark slot sits below it, shown only once the app is named.

### 3.7 Behaviours to keep

- **Back button:** closes the sheet, then the detail view, then other tabs return to Home. On Home, show the toast "Press back again to exit".
- **Offline:** fonts are bundled locally (@fontsource/michroma, @fontsource/inter-tight). Icons are inline SVG.
- **Reduce motion:** respect `prefers-reduced-motion` (see §4).

---

## 4. Motion (final)

- CSS transitions only: transform, opacity, width, color, stroke-dashoffset.
- Nothing longer than 800 ms, and nothing blocks taps.
- **Reduce motion:** every moment becomes a 150 ms opacity change. No movement, no sheen, no counter roll, no glow pulses.

| Moment | What moves | ms | Easing | Delay / stagger | Reduced |
|---|---|---|---|---|---|
| Press button or row | scale → 0.97 (rows 0.98), glass brightens, springs back | 120 | press | none | background only |
| Tick done | 1. ring fills amethyst from the centre (scale 0 → 1)<br>2. tick draws (dashoffset 24 → 0)<br>3. strike line draws across the name<br>4. row dims and drops 4 px<br>5. **the matching dial segment fills gold** and the lume dot slides to the next segment<br>6. the row then moves to Done | 1: 200 · 2: 180 · 3: 180 · 4: 200 · 5: 300 | enter | 2: 140 · 3: 200 · 4: 200 · 5: 150 · 6: at 450 | fades |
| Untick | reverse | 250 total | exit | ring out 100 | fade |
| Open sheet | grows from the tapped row (translateY 40%, scale 0.86/0.3 → 1); background dims to 35% | 300 | enter | none | fade |
| Close sheet | reverse into the row | 250 | exit | none | fade |
| Weight + / − | number strip rolls one step (60 px) through the window; gold total dips to 0.2 and returns | 200 / 100 + 100 | enter | none | instant swap, fade |
| Hold + / − | repeats; the interval starts at 300 ms and shrinks ×0.75 per step to 80 ms | continuous | none | first repeat at 300 | no roll |
| Switch shoulder exercise | selector pill slides; figure cross-fades | 250 | enter | none | fade |
| Last exercise done | final segment fills; bezel opacity 0.7 → 1; gold glow rises; count turns gold; one sheen sweeps around the bezel (rotating conic highlight) | 300 / 400 / 600 | enter | sheen 250 | fade, no sheen |
| Finish workout | 1. button fills gold (opacity)<br>2. one shimmer stripe crosses it<br>3. the dial text cross-fades to LOGGED<br>4. the saved card rises 24 px<br>5. the Wed dot fills gold | 1: 250 · 2: 450 · 3: 300 · 4: 400 · 5: 250 (800 total) | enter | 2: 150 · 3: 250 · 4: 350 · 5: 550 | fades |
| Switch tab | content out (opacity 0, +8 px); in (0 px); active pill glides | 90 / 110 / 200 | exit / enter | in at 90 | cross-fade |
| App open | bezel ticks draw clockwise (dashoffset); AM fades in; lume dot lights last; one warm sheen | 450 / 300 / 150 / 500 | enter | AM 250 · lume 550 · sheen 350 | fade |
| New best | window border and value → gold, PB tag fades in, one sheen | 200 + 600 | enter | sheen 200 | fade |
| Chart hover | crosshair and tooltip appear | 80 | enter | none | instant |

**Sheen recipe:** a child element with `overflow: hidden` on the parent, `width: 50–60%`, `background: linear-gradient(100deg, transparent, rgba(255,255,255,0.7), transparent)`, animated from `translateX(-100%)` to `translateX(220%)`. Keep it at opacity 0 when it is not playing.

The motion board (screenshot 16) is a live prototype on the canvas. Press Play on that frame to feel the timings.

---

## 5. Voice sheet: every user-facing string

Voice: short, calm, confident, precise. Second person, present tense. No exclamation marks, no emoji. Sentence case for sentences; Michroma CAPS for labels and buttons.

**Tabs:** HOME · ROUTINES · LIBRARY · PROGRESS · SETTINGS

**Home**

- Date label: WED · 17 NOV (format: ddd · d MMM, caps)
- Dial: GYM DAY · {n}/8 · about {n} min · That's the lot · LOGGED · Session saved
- Week strip: MON · WED · {n}-WEEK STREAK
- Status: Your session is ready. · {Weekday}'s still open. · That's the lot. · Two for two this week. (one session: "One for two this week."; three or more: "Three this week.")
- Labels: WARM-UP · STILL TO DO · DONE
- Warm-up text: Bike ride to the gym, arm circles, band pull-aparts
- Row meta: 3 × 10–12 · stack · {n} kg plates · ≈ {n} kg · 3 × 10–12 · dumbbell · one arm · Or: Shoulder press machine
- PB tag: PB · announcement: New best.
- Buttons: FINISH WORKOUT · BACK UP NOW
- Saved card: SESSION LOGGED · Two for two this week. · {n} min · {n} exercises · {n} new best(s)
- Toast: Press back again to exit
- Tick announcement: Done.

**Exercises:** Lat pulldown · Seated cable row · EZ-bar preacher curl · Triceps rope pushdown · Leg press 45° · Barbell bench press · Goblet squat · Cable lateral raise · Shoulder press machine

**Sheet**

- Header: {N} OF VIII · Close (aria)
- Switch: LATERAL RAISE · SHOULDER PRESS
- Phases: PULL · PUSH · SQUEEZE · LOWER · RAISE
- Animation: 1× · 0.5× · Tap to pause · START · END
- Reps: 3 × 10–12
- Weight labels: NUMBER ON THE WEIGHT STACK · PLATES YOU ADDED · BOTH SIDES · DUMBBELL WEIGHT · LAST TIME · {n}
- Base box: Olympic bar: 20 kg · Sled: 40 kg · EZ bar: 10 kg · Change {base} weight · ≈ {n} KG
- Muscles: PRIMARY · ALSO
- Caution: Stop short of any pain in the range (sensitive left shoulder).
- Button: MARK AS DONE
- aria: Less weight · More weight · Mark done: {name} · Mark not done: {name}

**Library**

- {n} EXERCISES · LIBRARY · Search exercises
- Chips: ALL · BACK · CHEST · LEGS · SHOULDERS · ARMS · ANY · CABLE · PLATES · DUMBBELL
- Meta format: {EQUIPMENT} · {MUSCLE}
- HIDDEN EXERCISES ({n}) · HIDE · RESTORE
- Empty search: Nothing matches. Try another word.

**Routines** (style as Library rows and panels)

- ROUTINES · RENAME · ADD FROM LIBRARY · ADD A TEXT BLOCK · REMOVE · MOVE UP · MOVE DOWN · SETS · REPS
- Remove confirm: Remove {name} from this routine?

**Progress**

- TRAINING WEEK {nn} · PROGRESS · THIS WEEK
- Recap: {MONTH} RECAP · sessions · new bests · cm waist
- Log: LOG TODAY · Weight (kg) · Waist (cm) · SAVE TODAY'S ENTRY · confirmation: Saved.
- Charts: Body weight · Waist · Weekly average · kg / cm · SHOW TABLE · SHOW CHART · 8 weeks ago · This week · tooltip "Wk {n} · {v} {unit}"
- Photos: Progress photos · Next photos in {n} days · Photos due today. · TOOK THEM TODAY
- Backup: Keep a copy safe. · Last backup {n} weeks ago · BACK UP
- History: HISTORY · Gym day · {n} min · 3 sets with weight logged · {n} exercises
- Empty history: Your first session will appear here.

**Settings**

- VERSION {YYYY-MM-DD} · SETTINGS
- GYM DAYS · Monday and Wednesday
- THEME · SYSTEM · LIGHT · DARK
- Import:
  - IMPORT · Paste a routine pack here · CHECK PACK · CHOOSE FILE · APPLY
  - Preview: A preview of what will change appears here before you apply.
  - Check passed: Pack looks good. {n} changes.
  - Check failed: That pack didn't read. Check it and try again.
  - File error: That file didn't read. Try another.
- Backup:
  - BACKUP · EXPORT ALL DATA · Opens your phone's share menu, for example to save to Google Drive. · RESET TO DEFAULTS
  - Reset confirm: Reset everything to defaults? Your logged history will be cleared. Back up first if you want to keep it. · RESET · CANCEL

---

## 6. Icon and logo files

**Icons:** 24 × 24 viewBox, 1.5 px stroke, round caps and joins, no fill.

- **`-outline`:** stroke `#A39BB3`, node `#A39BB3`.
- **`-active`:** stroke `#C9B4FF` (lume), with a blurred `#8B6CFF` copy underneath for the glow, and the node `#E3C98F`.
- **Achievement icons:** active state is a `#E3C98F` stroke without glow.

To tint in code, swap the stroke and fill values from tokens.

| `svg/icons/` | Meaning | Gold node at |
|---|---|---|
| home, routines, library, progress, settings | Tab icons | door, last bullet, spine, line tip, knob |
| tick | Done | tick end |
| plus, minus, close, chevron | Controls | none |
| switch | Swap either/or exercise | arrow start |
| edit | Rename / edit | pen tip |
| backup | Export / share / back up | base |
| move-pull, move-push, move-press, move-curl, move-legs, move-shoulders | Exercise badges (Library) | bar, wall, base, none, knee, hand |
| award-streak, award-medal, award-week | Streak, new best, week complete | ember, medal, tick |

| `svg/brand/` | What it is |
|---|---|
| monogram-gold.svg | Primary mark, a watch bezel. Outer ring 2.5 px; 48 minute marks (1 px at 55%); 12 hour marks (2.5 px); "AM" in Michroma 46, letter-spacing 2; an amethyst lume dot (#8B6CFF) at 12 o'clock. Gold gradient #F6E7BF → #E3C98F → #A8884A. |
| monogram-lume.svg, monogram-white.svg | One-colour versions |
| monogram-small.svg | Below 48 px: a thick ring and the letters only. Minimum 24 px. |
| lockup-horizontal.svg, lockup-stacked.svg | Mark plus the "[NAME]" slot (Michroma, letter-spacing 12, gold). Replace the slot once the app is named. |
| app-icon-512.svg | Rounded obsidian square with an amethyst corner glow; the bezel at about 72% |
| app-icon-maskable-512.svg | Full bleed; the mark sits inside the 80% safe circle |
| splash-mark.svg | Splash mark at 170 px |

**Notes:**

- The brand SVGs use live Michroma `<text>`. The font is bundled for the UI anyway, but convert the text to outlines before exporting the 192 and 512 PNGs for the manifest.
- **Clear space:** a quarter of the mark's width on every side.

---

## 7. Changes from the original hand-off (Part 3)

Avi approved a full redesign in which everything was open: the concept "Horology" (the layout of concept A) with an "Obsidian & light" colour approach (concept C), pushed further. The changes are:

1. **Concept:** a fine watch at night. The progress card is replaced by a dial with 8 gold segments, a bezel, minute marks and a lume dot for the next exercise.
2. **Palette:** obsidian `#07060A` with an amethyst light glow and film grain. Gold changes from #CFAE6E to champagne `#E3C98F`. A new lume `#C9B4FF` and chart amethyst `#9575FF` are added. The amethyst-for-action / gold-for-achievement rule is kept, and only amethyst glows.
3. **Fonts:** Barlow Condensed and Inter are replaced by **Michroma** (numbers, labels, buttons, titles; CAPS) and **Inter Tight** (names and body).
4. **Surfaces:** frosted-glass cards on every row are replaced by **hairline lists**. Glass panels (a gradient with a top highlight) are kept only for interactive blocks. Recessed "windows" hold inputs and the weight.
5. **Rows:** Roman numerals I–VIII, the tick ring moves to the right, the weight is engraved on the right, and the exercise badge is removed from Home rows (badges stay in the Library).
6. **Weight field:** becomes a watch date window that rolls; it turns gold for a new best.
7. **Monogram:** option B is replaced by a **bezel mark** (Michroma AM with minute and hour ticks and an amethyst lume dot).
8. **Figure:** working limbs glow lilac with an amethyst halo; equipment is darker; head stroke 4.5 px.
9. **Charts:** rebuilt to the dataviz skill. One series, palette-validated line colour, clean ticks, an area wash, an end dot with a ring and a direct label, crosshair tooltip, and a table view.
10. **Icons:** stroke changes from 1.75 to 1.5 px. The active state is lume with a glow; achievements are gold without glow.
11. **Buttons:** all pills, with Michroma CAPS labels. Finish stays glass until every exercise is done, then turns gold.
12. **Tab bar:** a dark pill with CAPS labels, the active pill glowing.
13. **Motion:** adds the dial segment fill on tick, the bezel sweep on the last exercise, the dial cross-fade to LOGGED, and app-open ticks drawing clockwise.
14. **Earlier decisions still in force:** no photos anywhere; dark first; no vibration; offline; the original content and behaviours.
