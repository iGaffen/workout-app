# Gym plan: design spec v1 (Noir & Amethyst)

Source of truth for the redesign. Built in Figma first, then in the app. Decisions marked **(decided)** came from Avi; the rest are proposals to confirm in Figma.

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

## 5. Icons
Thin line icons, 1.75 px stroke, rounded ends, 24 px grid, in `text/secondary`; the active one is `accent/amethyst`. One set throughout: home, list, library (dumbbell), progress (line), settings, tick, chevron, plus, minus, close, switch (two arrows).

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

## 9. Figma file structure
Pages: References, Foundations (variables for colour with dark and light modes, type styles, spacing, radii, effects), Icons, Components (with variants for each state), Screens, Motion (a prototype for each row of the motion table).

## 10. App mark (decided: monogram)
A monogram in `metal/gold-sheen` on `bg/base`, set in Barlow Condensed 700 with a thin gold ring. Proposal: **"AM"** (Avi Moshe); alternative: "G" for Gym plan. It's used for the app icon (with a maskable safe zone), the splash, and the app-open sheen.
