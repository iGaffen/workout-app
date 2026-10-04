import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import { readFileSync } from "fs";
const svg = readFileSync("public/icon.svg", "utf8");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [size, name, pad] of [[192, "icon-192.png", 0], [512, "icon-512.png", 0], [512, "icon-maskable-512.png", 0.12]]) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  const inner = size * (1 - pad * 2);
  await p.setContent(`<body style="margin:0;background:#172033"><div style="width:${inner}px;height:${inner}px;margin:${size * pad}px">${svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</div></body>`);
  await p.screenshot({ path: `public/${name}` });
}
await b.close();
