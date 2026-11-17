// Renders the brand app icon SVGs (letters already outlined) to the PNGs the PWA manifest needs.
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import { readFileSync, copyFileSync } from "fs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const jobs = [
  ["src/assets/brand/app-icon-512.svg", 192, "public/icon-192.png"],
  ["src/assets/brand/app-icon-512.svg", 512, "public/icon-512.png"],
  ["src/assets/brand/app-icon-maskable-512.svg", 512, "public/icon-maskable-512.png"],
];
for (const [src, size, out] of jobs) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  const svg = readFileSync(src, "utf8").replace(/<svg /, `<svg style="display:block;width:${size}px;height:${size}px" `);
  await p.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
  await p.screenshot({ path: out, omitBackground: true });
}
await b.close();
copyFileSync("src/assets/brand/app-icon-512.svg", "public/icon.svg");
