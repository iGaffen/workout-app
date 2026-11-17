// Renders the Android launcher icons, adaptive-icon foreground and splash screens from the brand SVGs.
// Usage: node scripts/android-icons.mjs  (after scripts/outline_text.py has outlined the letters)
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import { readFileSync, readdirSync, statSync } from "fs";
const RES = "android/app/src/main/res";
const svg = (f) => readFileSync(`src/assets/brand/${f}`, "utf8");
const mark = svg("monogram-gold.svg").replace(/<svg /, '<svg style="width:100%;height:100%;display:block" ');
const icon = svg("app-icon-512.svg").replace(/<svg /, '<svg style="width:100%;height:100%;display:block" ');
const png = (f) => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
async function shot(html, w, h, out, transparent = false) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${transparent ? "transparent" : "#050407"}">${html}</body>`);
  await p.screenshot({ path: out, omitBackground: transparent });
  await p.close();
}
for (const dir of readdirSync(RES)) {
  for (const f of readdirSync(`${RES}/${dir}`)) {
    const path = `${RES}/${dir}/${f}`;
    if (!f.endsWith(".png") || statSync(path).size === 0) continue;
    const [w, h] = png(path);
    if (f === "ic_launcher_foreground.png") {
      // Adaptive icon: the mark fills ~56% of the 108dp canvas so every mask shape keeps the bezel, with a soft lume glow behind.
      await shot(`<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(124,82,255,.45),transparent 42%)"></div><div style="position:absolute;left:22%;top:22%;width:56%;height:56%">${mark}</div>`, w, h, path, true);
    } else if (f === "ic_launcher.png" || f === "ic_launcher_round.png") {
      await shot(`<div style="width:100%;height:100%;${f.includes("round") ? "border-radius:50%;overflow:hidden" : ""}">${icon}</div>`, w, h, path, true);
    } else if (f === "splash.png") {
      const s = Math.min(w, h) * 0.32;
      await shot(`<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 46%,rgba(124,82,255,.40),transparent 45%)"></div><div style="position:absolute;width:${s}px;height:${s}px;left:${(w - s) / 2}px;top:${(h - s) / 2}px">${mark}</div>`, w, h, path);
    }
  }
}
await b.close();
