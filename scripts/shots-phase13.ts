// pnpm shots:13: screenshots for every role at 390 and 1280, light and dark, into docs/screenshots/phase-13/.
// Runs the built app on a demo team (scripts/lib/demoTeam.ts). Also fails on horizontal page scroll.
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { ensureBuild, startApp } from "./lib/app";
import { signInCookie } from "./lib/browserAuth";
import { seedFullDemo } from "./lib/demoTeam";
import { createScratchDb } from "../src/lib/db/scratch";
import { createPool } from "../src/lib/db/pool";
import { loadLocalEnv } from "./lib/loadEnv";

const dir = "docs/screenshots/phase-13";
mkdirSync(dir, { recursive: true });
loadLocalEnv();
ensureBuild();
const scratch = await createScratchDb("okit_shots");
const pool = createPool(scratch.config, 4);

const { plan: PLAN } = await seedFullDemo(pool);

const app = await startApp({ db: scratch.config, port: Number(process.env.PORT ?? 5021) });
const browser = await chromium.launch();
let overflow = 0;

async function shot(page: Page, file: string, width: number, p: string) {
  await page.evaluate(() => document.fonts.ready);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > width) { overflow++; console.error(`OVERFLOW ${p} @${width}: scrollWidth ${sw}`); }
  await page.screenshot({ path: file, fullPage: true });
}

try {
  for (const width of [390, 1280]) for (const scheme of ["light", "dark"] as const) {
    const fresh = async (user?: string) => {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      if (user) await signInCookie(ctx, pool, app, user);
      if (scheme === "dark") await ctx.addInitScript(() => localStorage.setItem("ok-theme", "dark"));
      return { ctx, page: await ctx.newPage() };
    };
    // Signed out
    { const { ctx, page } = await fresh(); await page.goto(app.url + "/login", { waitUntil: "networkidle" }); await shot(page, `${dir}/signed-out-login-${width}-${scheme}.png`, width, "/login"); await ctx.close(); }
    for (const [user, label, paths] of PLAN) {
      const { ctx, page } = await fresh(user);
      for (const p of paths) {
        await page.goto(app.url + p, { waitUntil: "networkidle" });
        const slug = p === "/" ? "home" : p.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-");
        await shot(page, `${dir}/${label}-${slug}-${width}-${scheme}.png`, width, `${user} ${p}`);
      }
      await ctx.close();
    }
    // The saved strip after Save, and the menu open on a phone.
    {
      const { ctx, page } = await fresh("ravi");
      await page.goto(app.url + "/console?cat=Fencing+%26+gates&st=TX&city=Austin&build=1", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Save this kit" }).click();
      await page.getByRole("region", { name: "Saved kit" }).waitFor();
      await page.getByRole("region", { name: "Saved kit" }).screenshot({ path: `${dir}/bd-console-saved-strip-${width}-${scheme}.png` });
      if (width === 390) {
        await page.goto(app.url + "/today", { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Menu" }).click();
        await shot(page, `${dir}/bd-menu-open-${width}-${scheme}.png`, width, "menu");
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await app.stop();
  await pool.end();
  await scratch.drop();
}
console.log(overflow ? `${overflow} overflow problem(s)` : `Screenshots in ${dir}. No horizontal page scroll at 390 or 1280.`);
process.exit(overflow ? 1 : 0);
