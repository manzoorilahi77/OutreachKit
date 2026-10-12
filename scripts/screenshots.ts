// Usage: pnpm shots <phase-number> [--as <username>] <path> [<path>...]
// Opens the paths as a demo account (default ravi, a BD) on a throwaway demo team, at 390px and 1280px, light and dark.
// Writes docs/screenshots/phase-NN/<slug>-<width>-<theme>.png, plus a horizontal-overflow check.
import { chromium } from "@playwright/test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ensureBuild, startApp } from "./lib/app";
import { signInCookie } from "./lib/browserAuth";
import { seedDemoTeam } from "./lib/demoTeam";

const args = process.argv.slice(2);
const asAt = args.indexOf("--as");
const as = asAt >= 0 ? args.splice(asAt, 2)[1]! : "ravi";
const [phase, ...paths] = args;
if (!phase || paths.length === 0) throw new Error("usage: pnpm shots <phase> [--as <username>] <path>...");
const dir = `docs/screenshots/phase-${phase.padStart(2, "0")}`;
mkdirSync(dir, { recursive: true });

ensureBuild();
const root = mkdtempSync(path.join(tmpdir(), "okit-shots-"));
process.env.OKIT_ROOT = root;
await seedDemoTeam(root);
const app = await startApp({ root, port: Number(process.env.PORT ?? 3100) });
const browser = await chromium.launch();
let overflow = 0;
try {
  for (const p of paths) {
    const slug = p === "/" ? "home" : p.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-");
    for (const width of [390, 1280]) {
      for (const scheme of ["light", "dark"] as const) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        await signInCookie(ctx, root, app.url, as);
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
  rmSync(root, { recursive: true, force: true });
}
console.log(overflow ? `${overflow} overflow problem(s)` : "No horizontal page scroll at 390 or 1280.");
process.exit(overflow ? 1 : 0);
