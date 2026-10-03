// Writes the app's icons from one mark: the plan as a solid line, the run as a dashed one
// under it, as the masthead draws it (Setup.jsx). Dark's colours, the app's first variant.
//
//   node scripts/make-icons.mjs
//
// Output in public/: favicon.svg, apple-touch-icon.png, logo192.png, logo512.png.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// Theme.js, dark: background, primary, secondary.
const BACKGROUND = "#3A3335";
const PLAN = "#f2af29";
const RUN = "#6E9075";

// The masthead's paths, on a 64 grid centred on (32, 32).
const MARK = `<path d="M6 38 L20 18 L30 28 L42 8 L58 38" fill="none" stroke="${PLAN}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M6 56 L20 38 L30 46 L42 28 L58 56" fill="none" stroke="${RUN}" stroke-width="3" stroke-dasharray="5 5" stroke-linejoin="round" stroke-linecap="round"/>`;

// The tab icon: a rounded tile, the mark nearly to its edges.
const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${BACKGROUND}"/>${MARK}</svg>\n`;

// why: the PNGs are maskable (vite.config.js), so the launcher may crop them to a circle of
// 80% of the side. Full-bleed square, and a 96 viewBox puts the mark (about 76 across its
// diagonal) inside that circle. iOS rounds the apple-touch-icon's corners itself.
const TILE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -16 96 96"><rect x="-16" y="-16" width="96" height="96" fill="${BACKGROUND}"/>${MARK}</svg>`;

const PNGS = [
  ["apple-touch-icon.png", 180],
  ["logo192.png", 192],
  ["logo512.png", 512],
];

writeFileSync(join(OUT_DIR, "favicon.svg"), FAVICON);

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size] of PNGS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${TILE}`,
  );
  await page.screenshot({ path: join(OUT_DIR, name), omitBackground: true });
}
await browser.close();

console.log(`wrote favicon.svg and ${PNGS.map(([name]) => name).join(", ")} to ${OUT_DIR}`);
