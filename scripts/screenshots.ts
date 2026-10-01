// Usage: pnpm shots <phase-number> <path> [<path>...]   (expects the app on PORT, default 3100)
// Writes docs/screenshots/phase-NN/<slug>-<width>-<theme>.png, plus a horizontal-overflow check.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [phase, ...paths] = process.argv.slice(2);
if (!phase || paths.length === 0) throw new Error("usage: pnpm shots <phase> <path>...");
const base = `http://localhost:${process.env.PORT ?? 3100}`;
const dir = `docs/screenshots/phase-${phase.padStart(2, "0")}`;
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
let overflow = 0;
for (const path of paths) {
  const slug = path === "/" ? "home" : path.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-");
  for (const width of [390, 1280]) {
    for (const scheme of ["light", "dark"] as const) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
      const page = await ctx.newPage();
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > width) { overflow++; console.error(`OVERFLOW ${path} @${width}: scrollWidth ${sw}`); }
      await page.screenshot({ path: `${dir}/${slug}-${width}-${scheme}.png`, fullPage: true });
      await ctx.close();
    }
  }
}
await browser.close();
console.log(overflow ? `${overflow} overflow problem(s)` : "No horizontal page scroll at 390 or 1280.");
process.exit(overflow ? 1 : 0);
