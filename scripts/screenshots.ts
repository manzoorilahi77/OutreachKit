// Usage: pnpm shots <phase-number> [--as <username>] <path> [<path>...]
// Opens the paths as a demo account (default ravi, a BD) on a throwaway demo team, at 390px and 1280px, light and dark.
// Writes docs/screenshots/phase-NN/<slug>-<width>-<theme>.png, plus a horizontal-overflow check.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { ensureBuild, startApp } from "./lib/app";
import { signInCookie } from "./lib/browserAuth";
import { seedDemoTeam } from "./lib/demoTeam";
import { createScratchDb } from "../src/lib/db/scratch";
import { createPool } from "../src/lib/db/pool";
import { loadLocalEnv } from "./lib/loadEnv";

const args = process.argv.slice(2);
const asAt = args.indexOf("--as");
const as = asAt >= 0 ? args.splice(asAt, 2)[1]! : "ravi";
const [phase, ...paths] = args;
if (!phase || paths.length === 0) throw new Error("usage: pnpm shots <phase> [--as <username>] <path>...");
const dir = `docs/screenshots/phase-${phase.padStart(2, "0")}`;
mkdirSync(dir, { recursive: true });

loadLocalEnv();
ensureBuild();
const scratch = await createScratchDb("okit_shots");
const pool = createPool(scratch.config, 4);
await seedDemoTeam(pool);
const app = await startApp({ db: scratch.config, port: Number(process.env.PORT ?? 5021) });
const browser = await chromium.launch();
let overflow = 0;
try {
  for (const p of paths) {
    const slug = p === "/" ? "home" : p.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-");
    for (const width of [390, 1280]) {
      for (const scheme of ["light", "dark"] as const) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        await signInCookie(ctx, pool, app, as);
        if (scheme === "dark") await ctx.addInitScript(() => localStorage.setItem("ok-theme", "dark"));
        const page = await ctx.newPage();
        await page.goto(app.url + p, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        const sw = await page.evaluate(() => document.documentElement.scrollWidth);
        if (sw > width) { overflow++; console.error(`OVERFLOW ${p} @${width}: scrollWidth ${sw}`); }
        await page.screenshot({ path: `${dir}/${slug}-${width}-${scheme}.png`, fullPage: true });
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  await app.stop();
  await pool.end();
  await scratch.drop();
}
console.log(overflow ? `${overflow} overflow problem(s)` : "No horizontal page scroll at 390 or 1280.");
process.exit(overflow ? 1 : 0);
