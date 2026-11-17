# Claude Design brief: workout app redesign

> **Superseded:** use `docs/design-handoff.md` instead. It is one self-contained file to send to a new tool.

How to take `docs/design-spec.md` into Claude Design, work it into a finished brand and app design, and bring back what's needed to build it.

## 0. Before you start
- Have `docs/design-spec.md` open. Paste it into the first message, or attach the file.
- Collect your references: screenshots of apps, brands, materials. Write **one line per image** on what you like about it.
- Work in this order. Finish and approve each step before the next, because later steps reuse earlier ones.

## 1. First message to paste into Claude Design

> I'm designing a fully branded personal workout app for my Android phone (a PWA, portrait, 390 × 844). It's a private brand to keep me motivated, not for sale, and the name is TBD. Attached is my design spec: follow it as the source of truth (Noir & Amethyst palette, frosted glass surfaces, Barlow Condensed and Inter, refined motion with no haptics, custom icon family with a gold-dot signature, a gold monogram logo, and a calm coach-like voice).
>
> Work in stages and stop after each one for my approval:
> 1. Brand: monogram logo ("AM" for now) in a thin gold ring, with lock-ups, the app icon (maskable) and a splash.
> 2. Foundations: colour tokens (dark first), type scale, spacing, radii, glass effects, shown as a style sheet.
> 3. Icons: the full custom set from the spec, outline and active, as SVG.
> 4. Components: every component in the spec with all its states side by side.
> 5. Screens: Home checklist, exercise sheet, Library, Progress, Settings, "Workout saved".
> 6. Motion: interactive prototypes for each moment in the spec's motion table, with exact durations and easing.
>
> Keep everything accessible: text contrast at least 4.5:1, touch targets at least 48 px, and a "reduce motion" fallback. Here are my references, each with a note on what I like: [attach].

## 2. The app's real content (so screens use real data, not placeholders)
**Home list**, 3 × 10–12 each, about 48 min:
1. Lat pulldown: stack number
2. Seated cable row: stack number
3. EZ-bar preacher curl: plates + W bar ≈ 10 kg
4. Triceps rope pushdown: stack number
5. Leg press (45° linear): plates + sled ≈ 40 kg
6. Barbell bench press: plates + bar 20 kg
7. Goblet squat: dumbbell weight
8. Shoulders: cable lateral raise (one arm) **or** shoulder press machine (switch in the card)

**Tabs:** Home, Routines, Library, Progress, Settings.

**Each exercise sheet has:** an animation (stick-figure, side view), name, reps pill, option switch (shoulders only), weight field with its label ("Plates you added (both sides together)", "Number on the weight stack" or "Dumbbell weight"), a base and total box ("Olympic bar: 20 kg · Total ≈ 60 kg", with "Change bar weight"), a front and back muscle map with "Primary / Also" chips, 2–3 form cues, a caution note, and "Mark as done".

**Progress has:** a week card (Mon/Wed chips, streak), body-weight and waist trend charts (weekly averages, a "Show as table" option), a log form, a progress-photo reminder, a backup reminder, history, and a monthly recap.

**Settings has:** gym days (7 day toggles), theme, import pack (paste or file, preview, apply), export backup, reset, version label.

**Behaviours to design:** tick in any order (done rows move to "Done"); a back gesture closes the top layer first and shows "Press back again to exit" on Home; the day's ticks persist until finished; works offline.

## 3. Hand-back: what to bring me
Ask Claude Design for these at the end, then send them to me (attach files, or paste the canvas or artifact link):

1. **Design tokens as JSON or CSS variables**, with names and values for colours (including glass rgba and blur values and gradients), type styles (family, size, weight, line height, letter-spacing), spacing, radii, shadows and glows. Ask it to "export the foundations as CSS custom properties".
2. **Every screen as HTML/CSS** (the canvas artboards are HTML; a link to the canvas works) plus a PNG screenshot of each.
3. **Every component state**: row (to do / pressed / done / option row), buttons, weight field, chips, tab bar, sheet, toast and the saved card.
4. **Icons and logo as SVG files**: each icon in outline and active, the monogram, lock-ups, and the app icon at 512 px plus a maskable version.
5. **Motion table, final version:** for each moment, what moves, the duration in ms, the easing curve, and any delay or stagger. A screen recording of each prototype helps a lot.
6. **Voice sheet:** every piece of user-facing text (empty states, toasts, buttons, labels, errors).
7. **Fonts:** names and weights (Google Fonts are fine; I'll bundle them for offline use).
8. **Anything you changed from the spec**, as a short list, so I update `docs/design-spec.md` to match.

## 4. Things to keep in mind (technical limits)
- **Glass blur** costs performance on older phones. Keep it to the tab bar, sheets and cards, not every element, and keep a solid-colour fallback.
- **Haptics are off** (decided), and iPhone-only effects don't apply, since this is an Android PWA in Chrome.
- **Fonts and icons must work offline**; I bundle them, so no linked-only assets.
- **The stick-figure animations** are drawn by the app's own engine; design their colours and line weights (body, far limb, equipment, accent), not frame-by-frame art.
- **Charts** follow the spec's colours: one series per chart, never two y-axes.
- **No real names, logos or brands** of other companies in the final design.
