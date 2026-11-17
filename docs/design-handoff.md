# Design hand-off: personal workout app redesign

> **For the assistant reading this:** you have no other context, and this file is all of it. Read it fully before replying. The person you're working with is **Avi**, the app's owner. He's non-technical, a visual thinker with a photography background, and works on Windows. He wants plain-English explanations, concise answers, and clickable choices where possible. When you finish, you'll produce a **build pack** (Part 6) that he carries back to a developer (another Claude session) who will build exactly what you design.

---

## Part 1. What this is

**The app:** a personal workout app that Avi uses at the gym on his **Android phone**. It's a web app installed from Chrome (a PWA): full screen, its own icon, and it **works fully offline**. All data stays on the phone. It's private, one user, **not for sale**.

**The goal of this work:** a **full redesign into a premium personal brand**, with its own logo, custom icons, colours, type, voice and micro-animations, so going to the gym feels special and motivating. The **name is not decided yet**, so design so a name can drop in later.

**How Avi trains:** Monday and Wednesday. He walks into the gym, glances at the list, does an exercise (3 sets), puts the phone in his pocket, and checks it again only between exercises. He does exercises **in any order** (machines may be taken), so the app is a **checklist**, not a step-by-step coach. He logs the weight he used. There's no rest timer and no per-set tapping.

**Already decided, so don't re-ask:** dark first (light theme later), the **Noir & Amethyst** palette, **frosted glass** surfaces, **Barlow Condensed** (headlines and numbers) with **Inter** (body), **refined** motion, **no vibration or haptics**, a **gold monogram** logo, and a **custom** icon set.

---

## Part 2. What the app does today (real content: design with this, not placeholders)

### Tabs (bottom bar)
**Home · Routines · Library · Progress · Settings**

### Home: today's checklist
- **Week card:** "This week: 1 of 2 gym workouts", with day chips **Mon** and **Wed** that fill when a workout is logged on that day. Extra days show as extra filled chips.
- **Workout card:** title "Gym day", "About 48 min · 3 of 8 done", a small warm-up line at the top ("Bike ride to the gym, arm circles, band pull-aparts"), then the list.
- **Each row:** a circle to tick done; the exercise name (large); a line underneath with sets × reps and the weight, e.g. "3 × 10–12 · 40 kg plates ≈ 60 kg" or "stack 45" or "12 kg dumbbell"; and a › chevron. Tapping the circle marks the exercise done, and done rows move to a **"Done"** section at the bottom, dimmed and crossed out. Tapping anywhere else on the row opens the **exercise sheet**.
- **Shoulder row** is an either/or slot: it shows the current pick plus a line "Or: Shoulder press machine (tap to switch)".
- **"Finish workout"** button at the bottom saves the session, then a **"Workout saved"** card appears with a **"Back up now"** button.
- Ticks and weights stay saved if the app is closed, until the day changes or the workout is finished.

### The list (all 3 × 10–12)
1. **Lat pulldown:** cable machine; weight = number on the weight stack
2. **Seated cable row:** cable; stack number
3. **EZ-bar preacher curl:** W bar on a preacher bench; weight = plates added, plus the bar (about 10 kg)
4. **Triceps rope pushdown:** cable with rope; stack number
5. **Leg press (45° linear):** Technogym plate-loaded sled; plates added, plus the sled (about 40 kg)
6. **Barbell bench press:** Olympic bar; plates added, plus the bar (20 kg)
7. **Goblet squat:** dumbbell held at the chest; weight = dumbbell
8. **Shoulders:** cable lateral raise (one arm) **or** shoulder press machine; stack number

### Exercise sheet (opens from a row; a pop-up over Home)
From top to bottom:
- Close (X).
- **Option switch** (shoulders only): two segments, one per exercise.
- **Animation:** an animated stick figure, side view, doing the movement on its equipment, with a phase label underneath ("Lower", "Push", "Squeeze"), a 1x / 0.5x speed button, tap to pause, and a "Start / End" pair of still frames. It's drawn by the app's own engine, so design its **colours, line weights and the frame around it**, not the frames themselves.
- **Name** and a **reps pill** ("10–12").
- **Weight field:**
  - a label: "Plates you added (both sides together)" / "Number on the weight stack" / "Dumbbell weight"
  - − [ value ] + buttons
  - "Last time: 40"
  - for plate-loaded exercises, a box with "Olympic bar: 20 kg · Total ≈ 60 kg" and a "Change Olympic bar weight" link
- **Muscle map:** a front and back body silhouette with **primary** muscles in the accent colour and **secondary** in a lighter tint, plus chips "Primary: Lats" and "Also: Biceps, Rear shoulders". Tap it to enlarge.
- **Form cues** (2–3 bullets) and a **caution note** (e.g. "Stop short of any pain in the range (sensitive left shoulder)").
- **"Mark as done"** button.

### Library
Search box, filters (muscle group, equipment), a list of exercises; tap one for a detail view (big animation, muscle map, cues, notes, equipment, and a Hide/Restore button).

### Routines
The routine editor: rename, reorder with a drag handle and up/down buttons, edit reps, set the number of sets, remove, add from the library, add a text block.

### Progress
- **This week:** Mon/Wed chips, "Training week 5".
- **Log body measurements:** weight (kg) and waist (cm) fields, "Save today's entry".
- **Body weight** chart and **Waist** chart: weekly averages, one line each, tap a point to read it, "Show as table".
- **Progress photos** reminder ("Next photos in 12 days", "I took my photos today").
- **Backup due** card when needed.
- **History** list: date, session, duration, "3 sets with weight logged".

### Settings
- **Gym days:** 7 day toggles; Mon and Wed are on.
- **Theme:** System / Light / Dark.
- **Import:** paste box, "Check pack", "Choose file", then a preview and "Apply".
- **Backup:** "Export all data" (opens the phone's share menu, e.g. Google Drive) and "Reset to defaults".
- A footer with "Version 2026-11-17".

### Behaviours to keep
- The phone's back button closes the top layer first (pop-up, then detail screen, then other tab → Home). On Home it shows a toast **"Press back again to exit"**.
- Works offline, so fonts and icons are bundled.
- Respects the phone's "reduce motion" setting.

---

## Part 3. Design spec (the source of truth; refine it with Avi, and record any changes)

### 1. Feel
**Dark, refined, quietly powerful.** A private members' gym or a luxury watch, not a sports app. No neon, no loud "workout" energy. Gold and purple are used sparingly, like jewellery.

### 2. Colour (decided: Noir & Amethyst, dark first, light theme to follow)

| Token | Dark | Use |
|---|---|---|
| `bg/base` | `#0E0A14` | App background (plum-black) |
| `bg/glow` | radial `#2A1B45` at 35% → transparent | Soft purple glow, top of Home |
| `surface/glass` | `rgba(255,255,255,0.06)` + blur 24 px | Cards, rows, tab bar, sheets |
| `surface/glass-strong` | `rgba(28,20,40,0.72)` + blur 32 px | Pop-ups, so text stays readable |
| `stroke/hairline` | `rgba(255,255,255,0.10)` | 1 px card edges and dividers |
| `stroke/gold` | `#CFAE6E` at 60% | Done-state hairlines, highlights |
| `text/primary` | `#F3EEF8` | Names, numbers |
| `text/secondary` | `#A79FB5` | Meta text (sets × reps, kg) |
| `text/disabled` | `#6E6680` | Done rows |
| `accent/amethyst` | `#8B6CFF` | Primary buttons, ticks, progress, active tab |
| `accent/amethyst-ink` | `#140B24` | Text and icons on amethyst (contrast ≥ 4.5:1) |
| `accent/gold` | `#CFAE6E` | Secondary accent: totals "≈ kg", streaks, finish shimmer |
| `metal/gold-sheen` | linear `#E9CF95 → #CFAE6E → #A8884A` | Finish button sheen, done tick highlight |
| `state/danger` | `#FF8A8A` | Delete, reset |

Rules: amethyst is for actions; gold is for achievement and totals. Never both on the same element. Every text colour passes 4.5:1 on its background, and 3:1 for 24 px and up.

**Light theme (decided: later, derived from dark once it's final):** base `#F6F3FA`, glass `rgba(255,255,255,0.7)`, text `#1A1326`, amethyst `#5B3FD9`, gold `#9C7A35`.

### 3. Type
- **Display and numbers:** Barlow Condensed 600/700. Exercise names 22 px, screen titles 40 px, hero numbers 34–52 px, tabular figures.
- **Body and labels:** Inter 400/500/600 **(decided)**. Meta 14 px, labels 13 px with 1.5 px letter-spacing in caps for section headers ("STILL TO DO").
- Sentence case everywhere except small caps section labels.

### 4. Surfaces (decided: frosted glass)
- Cards and rows sit on `surface/glass` with a 1 px `stroke/hairline` and 20 px corners (rows 16 px).
- The `bg/glow` behind the glass gives it something to blur, so the effect reads as glass, not grey.
- Pop-ups (the exercise card) use `surface/glass-strong` so the animation and text stay readable.
- The tab bar is glass, floating 8 px above the bottom edge, with rounded corners.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32. Touch targets at least 48 px.

### 5. Icons (decided: custom set, not a stock pack)
A bespoke line-icon family drawn for this brand, so every icon shares the same DNA:
- 24 px grid, 1.75 px stroke, rounded ends and joins, 2 px corner radius on shapes.
- One brand detail repeated across the set: a small **gold node** (a 2 px dot or short cap), used where it makes sense, such as the end of the progress line, the dumbbell's plate or the active tab, so the set feels like one family.
- Two states: outline (`text/secondary`) and active (outline in `accent/amethyst` plus the gold node).
- **Navigation:** home, routines, library, progress, settings.
- **Actions:** tick, plus, minus, close, chevron, switch, edit, backup/share.
- **Exercise glyphs:** a simple mark per movement type (pull, push, press, curl, legs, shoulders), used as row badges and in the Library.
- **Achievement:** streak flame (in gold), trophy or medal, week complete.
Deliverables: an SVG for each icon, in an outline and an active version.

### 6. Motion (decided: refined, no vibration)
Global: ease-out `cubic-bezier(0.2, 0.8, 0.2, 1)` for entering, ease-in `cubic-bezier(0.4, 0, 1, 1)` for leaving, spring for presses. Nothing longer than 800 ms, nothing blocks taps. With "reduce motion" on, everything becomes a 150 ms fade.

| Moment | Behaviour | Duration |
|---|---|---|
| Press any button or row | Scales to 97%, glass brightens slightly, springs back | 120 ms |
| Tick an exercise done | Circle fills amethyst from the centre; tick draws itself; gold hairline sweeps under the row; row dims and slides into "Done"; progress bar grows | 400 ms |
| Untick | Reverse of the above | 250 ms |
| Open exercise card | Card grows out of the tapped row (shared element), background blurs and darkens | 300 ms ease-out |
| Close card | Shrinks back into its row | 250 ms ease-in |
| Weight + / − | Number rolls vertically like a watch counter; "≈ total" in gold cross-fades | 200 ms |
| Hold + / − | Repeats, speeding up from 300 ms to 80 ms per step | continuous |
| Switch shoulder exercise | Selector pill slides; animation cross-fades | 250 ms |
| Last exercise done | Progress bar completes with a single gold sheen pass | 600 ms |
| Finish workout | Button fills with `metal/gold-sheen`, shimmer passes once; "Workout saved" glass card rises; this week's day chip fills | 800 ms total |
| Switch tab | Content fades and shifts up 8 px; active indicator glides under the new tab | 200 ms |
| App open | Mark fades in with one sheen pass, then Home | under 1 s |

### 7. Components
- **Checklist row:** to do / pressed / done; with a shoulder-style "Or: … (tap to switch)" line.
- **Exercise sheet:** animation, name, reps pill, option switch, weight field, base and total box, muscle map, cues, "Mark as done".
- **Weight field:** − / value / + with label ("Plates you added", "Number on the weight stack", "Dumbbell weight").
- **Buttons:** primary (amethyst), finish (gold sheen), secondary (glass), text link.
- **Week chips:** Mon / Wed, to do and done.
- **Tab bar:** 5 tabs, glass, floating.
- **Progress bar**, **toast**, **"Workout saved" card**.

### 8. Screens
Home (checklist), exercise sheet, Library, Progress, Settings, "Workout saved" state. Phone frame 390 × 844.

### 9. Design canvas structure (Claude Design)
One canvas with sections (or pages) in this order: **References**, **Brand** (logo, wordmark, lock-ups, voice), **Foundations** (colour tokens, type, spacing, radii, glass effects), **Icons**, **Components** (every state side by side), **Screens** (390 × 844 phone frames), **Motion** (an interactive prototype for each row of the motion table). 

### 10. Brand
#### Name
TBD. Chosen later; everything below works without it, and the name drops into the wordmark slot.

#### Logo system (decided: custom logo)
- **Primary mark:** a monogram inside a thin gold ring (see the App mark below). Used for the app icon, the splash and the Settings footer.
- **Wordmark:** the app name in Barlow Condensed 700, letter-spaced, in gold sheen. Designed once the name is chosen.
- **Lock-ups:** mark only, mark with wordmark side by side, and mark with wordmark stacked.
- **Clear space:** the ring's width on every side. Minimum size 24 px.
- **Versions:** gold on plum-black (primary), and amethyst or white single-colour versions for small sizes.

#### Voice
Short, calm, confident, like a good coach who doesn't shout. Second person, present tense, no exclamation marks and no emoji.
- Empty Home: "Your session is ready."
- Tick: "Done." Last exercise: "That's the lot."
- Workout saved: "Session logged. Two for two this week."
- Missed day: "Wednesday's still open."
- Backup reminder: "Keep a copy safe."

#### Motivation moments (brand, not gamification noise)
- **Week chips** for Mon and Wed fill in gold; a full week earns a gold ring around the week card.
- **Streak:** consecutive complete weeks, shown quietly on Home ("4-week streak") with the gold flame icon.
- **Personal best:** when a logged weight beats your previous best for that exercise, the weight shows in gold with a small "PB" tag and a one-time sheen.
- **Monthly recap card** in Progress: sessions done, PBs, waist change.

#### Brand touchpoints
App icon (maskable), splash, app-open sheen, the "Workout saved" card, empty states, the PB tag and the share or backup card.

### 11. App mark (decided: monogram)
A monogram in `metal/gold-sheen` on `bg/base`, set in Barlow Condensed 700 with a thin gold ring. Proposal: **"AM"** (Avi Moshe) until the app has a name; then the monogram may switch to the name's initial. It's used for the app icon (with a maskable safe zone), the splash, and the app-open sheen.


---

## Part 4. How to work with Avi (stages: stop after each one for approval)

1. **References.** Ask Avi for his reference images and his one-line notes on each. Summarise what you take from them before designing.
2. **Brand.**
   - Monogram logo: "AM" for now, in a thin gold ring.
   - Lock-ups, a wordmark slot for the future name.
   - App icon at 512 px plus a maskable version.
   - Splash screen.
   - Voice sheet.
3. **Foundations.** Colour tokens, type scale, spacing, radii and glass effects, shown as a style sheet.
4. **Icons.** The full custom set from the spec, outline and active, with the gold-dot signature.
5. **Components.** Every component in every state, side by side.
6. **Screens.** Home (to do / partly done / all done / saved), exercise sheet (stack, plates, dumbbell and shoulder-switch versions), Library, Progress, Settings. Phone frame 390 × 844.
7. **Motion.** An interactive prototype for each moment in the motion table, with exact durations and easing.

Show 2–3 options when a choice is open; otherwise decide, and state your assumption in one line.

---

## Part 5. Technical limits the design must respect

- **Platform:** Android, Chrome, an installed PWA built in React. Not iOS-native, so no iOS-only effects.
- **Glass blur** costs battery and smoothness. Use it on the tab bar, sheets and cards, not on every small element, and give every glass surface a solid-colour fallback.
- **Offline:** fonts from Google Fonts are fine (they'll be bundled). Icons and logo must be SVG.
- **Animations:** CSS transitions and transforms only, so timing, easing, scale, opacity and translate. Avoid anything that needs heavy video or 3D.
- **Accessibility:**
  - text contrast at least 4.5:1 (3:1 for 24 px and up)
  - touch targets at least 48 px
  - never colour alone to show state (add a tick, a label or a shape)
  - a "reduce motion" fallback
- **Charts:** one series per chart, never two y-axes.
- **Don't** use other companies' logos or brand names.

---

## Part 6. The build pack: what to give Avi at the end

Produce these at the end. Avi will carry them to the developer.

1. **ONE Markdown file named `build-pack.md`** containing:
   1. **Design tokens as CSS custom properties** in one code block:
      - colours, including glass rgba, blur values and gradients
      - type styles (family, size, weight, line-height, letter-spacing)
      - spacing, radii, shadows and glows
      - the light theme too, if designed
   2. **Component specs:** for each component and state, sizes, padding, colours (by token name), borders, radii, and what changes on press, done or disabled.
   3. **Screen specs:** for each screen, the layout top to bottom with the components used, plus any measurements not covered by the components.
   4. **Motion table, final version:** moment / what moves / duration (ms) / easing (cubic-bezier) / delay or stagger / reduce-motion fallback.
   5. **Voice sheet:** every user-facing string (titles, buttons, labels, empty states, toasts, errors).
   6. **Icon and logo list:** the file name of each SVG and what it is.
   7. **Changes from Part 3**, as a short list.
2. **All SVGs** (icons in outline and active, monogram, lock-ups, app icon, maskable icon), in one zip or as separate files.
3. **A screenshot (PNG) of every screen and of the component sheet.**
4. **If the tool has a shareable link** to the design canvas, include it as well.

Keep `build-pack.md` self-contained, because the developer won't see your conversation either.
