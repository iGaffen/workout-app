import type { CapacitorConfig } from "@capacitor/cli";

// The Android app (see docs/android-app.md). Build the web app with BASE_PATH=/ before `cap sync`.
const config: CapacitorConfig = {
  appId: "app.gymplan.am",
  appName: "Gym plan",
  webDir: "dist",
  backgroundColor: "#07060A",
  android: { allowMixedContent: false },
};
export default config;
