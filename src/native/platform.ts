import { Capacitor } from "@capacitor/core";
/** True inside the Android app (Capacitor), false in the browser / installed web app. */
export const isNative = () => Capacitor.isNativePlatform();
