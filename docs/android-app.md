# Android app and widgets: spec

## Goal
A real Android app (APK) for Avi's Galaxy S26, with four home-screen widgets that **do the work inside the widget**. Tapping a widget never opens the app unless he taps "Open app".

## What Android widgets can and can't do (platform limits)
- **Can:** buttons, ticks, − / + steppers, vertically scrolling lists, switching pages with ◀ ▶ buttons, charts drawn as images, and resizing.
- **Can't:** a **keyboard or text field**. Android widgets have no text input, so numbers are entered with − / + steppers (hold-free taps).
- **Can't:** a **horizontal swipe** inside a widget. Paging uses ◀ ▶ buttons, and lists scroll vertically.
- **Custom fonts aren't supported** in widgets. They use the system font with the brand colours.

## The widgets
1. **Workout (action, 4×4, resizable).** The day's checklist, scrolling vertically. Each row has:
   - a tick
   - − / + weight (steps of 2.5) for weighted exercises
   - a "switch" button on the either/or shoulder slot

   The header shows "GYM DAY 3/8". The first tick starts the session clock. **Finish workout** logs the session from the widget. After that, the widget shows "Session logged".
2. **Week summary (info, 4×2).** Mon/Wed dots, "1 of 2 gym workouts", the streak, the latest body weight and waist, and a weekly-average weight chart.
3. **Lift progress (info, 4×2).** A chart of the top weight per session for one exercise, with ◀ ▶ to switch exercise and the current best shown.
4. **Body log (action, 4×2).** Weight (− / + 0.1 kg) and waist (− / + 0.5 cm), starting from the last entry, plus **Save**, which logs today's entry from the widget.

## How data flows
- **The app's data** stays in the app (IndexedDB inside the app's WebView).
- **A shared widget state** is a JSON snapshot kept in Android SharedPreferences:
  - today's checklist and weights
  - the week summary
  - recent body entries
  - per-lift session maxima

  The app pushes a fresh snapshot after every change, through a small native plugin (`WidgetBridge`).
- **Widget actions** update the snapshot natively, so the widget changes instantly, and add an event to a queue:
  - `toggle`
  - `weight`
  - `choose`
  - `finish`
  - `body`
- **When the app opens or resumes,** it takes the queued events, applies them to its real data in order (ticks and weights to today's session, finish as a logged session, body entries to Progress), then pushes a fresh snapshot.
- **The widgets keep working without the app ever being opened.** The info widgets compute their charts from the snapshot, which widget actions also update.

## The app itself
- **Wrapper:** the same React app, packaged with **Capacitor**. The design and features are unchanged.
- **Back button:** handled through Capacitor's App plugin, using the same closing order (pop-up, then detail, then tab, then "Press back again to exit").
- **Backup and import:**
  - **Export** writes the backup file and opens Android's share sheet (Capacitor Filesystem and Share).
  - **Import's** file picker works as before.
- **No service worker** in the native app, since its files are already on the phone.

## Building and installing
- **Build:** GitHub Actions builds the APK on every push to `main` and attaches it to the **"Android app"** GitHub release (`gym-plan.apk`).
- **Signing:** with a release keystore stored as the repository secret `ANDROID_KEYSTORE_B64`. The repository is public, so the key is never committed. Without the secret, CI builds a test APK signed with a throwaway key, which can't update an earlier install.
- **Install:** download the APK on the phone and allow "Install unknown apps" for the browser once.
- **Updates:** download the new APK and install it over the old one (same key). Data is kept.
- **Moving data from the web app:** Settings → Export in the web app, then Import in the new app.


## Workout widget v2 (live)

- Built on plain RemoteViews (not Glance): a tap is a broadcast to `WorkoutWidgetReceiver`, which edits the snapshot and redraws the tapped widget at once.
- Tapping an exercise name opens its card inside the widget: looping animation, reps and muscles, weight − / +, cues, Switch, Mark done (returns to the list), Back.
- The animation is a flipbook: the app renders 24 frames per exercise from the 3D stage (`src/native/frames.ts`) and stores them through `WidgetBridge.saveFrames`; the card plays them in a `ViewFlipper`.
- The Glance widgets (summary, lift, body) now bump a revision in their Glance state so they recompose with fresh data on every change.
- minSdk is 31 (Android 12), needed for RemoteViews collection items.

## Widget animation v3 (bundled loops)

- The ViewFlipper flipbook ran at about 9 uneven frames per second on the phone, and opening a card had to send about 7 MB of bitmaps to the launcher, so the previous exercise's frames could flash first.
- The built-in exercises now ship a 30 fps loop inside the APK, made by `node scripts/widget-frames.mjs`: about 90 frames each at 384×288, with holds merged.
- Each loop plays in an indeterminate `ProgressBar` whose drawable is an `animation-list`, the widget-safe way to run a frame animation. Opening a card now sends only a layout id.
- Changing the weight on an open card uses `partiallyUpdateAppWidget`, so the loop keeps running.
- Any other exercise falls back to the app-rendered flipbook.
- Re-run the script after changing an exercise's animation.
