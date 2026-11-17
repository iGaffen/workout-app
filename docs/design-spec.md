# Design spec v1: Noir & Amethyst

A **fully branded personal app**: a small private brand built to make going to the gym feel special and keep motivation up. It's not for sale. The name is TBD, so "the app" stands in until it's chosen.

Source of truth for the redesign. Designed in **Claude Design** first, then built in the app. Decisions marked **(decided)** came from Avi; the rest are proposals to confirm in Figma.

## 1. Feel
**Dark, refined, quietly powerful.** A private members' gym or a luxury watch, not a sports app. No neon, no loud "workout" energy. Gold and purple are used sparingly, like jewellery.

## 2. Colour (decided: Noir & Amethyst, dark first, light theme to follow)

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

## 3. Type
- **Display and numbers:** Barlow Condensed 600/700. Exercise names 22 px, screen titles 40 px, hero numbers 34–52 px, tabular figures.
- **Body and labels:** Inter 400/500/600 **(decided)**. Meta 14 px, labels 13 px with 1.5 px letter-spacing in caps for section headers ("STILL TO DO").
- Sentence case everywhere except small caps section labels.

## 4. Surfaces (decided: frosted glass)
- Cards and rows sit on `surface/glass` with a 1 px `stroke/hairline` and 20 px corners (rows 16 px).
- The `bg/glow` behind the glass gives it something to blur, so the effect reads as glass, not grey.
- Pop-ups (the exercise card) use `surface/glass-strong` so the animation and text stay readable.
- The tab bar is glass, floating 8 px above the bottom edge, with rounded corners.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32. Touch targets at least 48 px.

## 5. Icons (decided: custom set, not a stock pack)
A bespoke line-icon family drawn for this brand, so every icon shares the same DNA:
- 24 px grid, 1.75 px stroke, rounded ends and joins, 2 px corner radius on shapes.
- One brand detail repeated across the set: a small **gold node** (a 2 px dot or short cap), used where it makes sense, such as the end of the progress line, the dumbbell's plate or the active tab, so the set feels like one family.
- Two states: outline (`text/secondary`) and active (outline in `accent/amethyst` plus the gold node).
- **Navigation:** home, routines, library, progress, settings.
- **Actions:** tick, plus, minus, close, chevron, switch, edit, backup/share.
- **Exercise glyphs:** a simple mark per movement type (pull, push, press, curl, legs, shoulders), used as row badges and in the Library.
- **Achievement:** streak flame (in gold), trophy or medal, week complete.
Deliverables: an SVG for each icon, in an outline and an active version.

## 6. Motion (decided: refined, no vibration)
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

## 7. Components
- **Checklist row:** to do / pressed / done; with a shoulder-style "Or: … (tap to switch)" line.
- **Exercise sheet:** animation, name, reps pill, option switch, weight field, base and total box, muscle map, cues, "Mark as done".
- **Weight field:** − / value / + with label ("Plates you added", "Number on the weight stack", "Dumbbell weight").
- **Buttons:** primary (amethyst), finish (gold sheen), secondary (glass), text link.
- **Week chips:** Mon / Wed, to do and done.
- **Tab bar:** 5 tabs, glass, floating.
- **Progress bar**, **toast**, **"Workout saved" card**.

## 8. Screens
Home (checklist), exercise sheet, Library, Progress, Settings, "Workout saved" state. Phone frame 390 × 844.

## 9. Design canvas structure (Claude Design)
One canvas with sections (or pages) in this order: **References**, **Brand** (logo, wordmark, lock-ups, voice), **Foundations** (colour tokens, type, spacing, radii, glass effects), **Icons**, **Components** (every state side by side), **Screens** (390 × 844 phone frames), **Motion** (an interactive prototype for each row of the motion table). Workflow and hand-back: `docs/claude-design-brief.md`.

## 10. Brand
### Name
TBD. Chosen later; everything below works without it, and the name drops into the wordmark slot.

### Logo system (decided: custom logo)
- **Primary mark:** a monogram inside a thin gold ring (see the App mark below). Used for the app icon, the splash and the Settings footer.
- **Wordmark:** the app name in Barlow Condensed 700, letter-spaced, in gold sheen. Designed once the name is chosen.
- **Lock-ups:** mark only, mark with wordmark side by side, and mark with wordmark stacked.
- **Clear space:** the ring's width on every side. Minimum size 24 px.
- **Versions:** gold on plum-black (primary), and amethyst or white single-colour versions for small sizes.

### Voice
Short, calm, confident, like a good coach who doesn't shout. Second person, present tense, no exclamation marks and no emoji.
- Empty Home: "Your session is ready."
- Tick: "Done." Last exercise: "That's the lot."
- Workout saved: "Session logged. Two for two this week."
- Missed day: "Wednesday's still open."
- Backup reminder: "Keep a copy safe."

### Motivation moments (brand, not gamification noise)
- **Week chips** for Mon and Wed fill in gold; a full week earns a gold ring around the week card.
- **Streak:** consecutive complete weeks, shown quietly on Home ("4-week streak") with the gold flame icon.
- **Personal best:** when a logged weight beats your previous best for that exercise, the weight shows in gold with a small "PB" tag and a one-time sheen.
- **Monthly recap card** in Progress: sessions done, PBs, waist change.

### Brand touchpoints
App icon (maskable), splash, app-open sheen, the "Workout saved" card, empty states, the PB tag and the share or backup card.

## 11. App mark (decided: monogram)
A monogram in `metal/gold-sheen` on `bg/base`, set in Barlow Condensed 700 with a thin gold ring. Proposal: **"AM"** (Avi Moshe) until the app has a name; then the monogram may switch to the name's initial. It's used for the app icon (with a maskable safe zone), the splash, and the app-open sheen.
