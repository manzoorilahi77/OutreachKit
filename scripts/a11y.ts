// pnpm a11y: axe-core on every screen, light and dark, at 390 and 1280 (WCAG 2.x A and AA), for every role, plus keyboard checks.
// Runs the built app on a demo team (scripts/lib/demoTeam.ts); signed-in screens use a session cookie signed with the app's own secret.
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ensureBuild, startApp } from "./lib/app";
import { signInCookie } from "./lib/browserAuth";
import { seedFullDemo } from "./lib/demoTeam";

ensureBuild();
const root = mkdtempSync(path.join(tmpdir(), "okit-a11y-"));
process.env.OKIT_ROOT = root;
const { plan } = await seedFullDemo(root);
const app = await startApp({ root, port: Number(process.env.PORT ?? 3100) });
const browser = await chromium.launch();

const PUBLIC = ["/login"];
const consoleBuilt = "/console?cat=Fencing+%26+gates&st=TX&city=Austin&build=1";
const screens: { user: string | null; path: string }[] = [
  ...PUBLIC.map((p) => ({ user: null, path: p })),
  ...plan.flatMap(([user, , paths]) => paths.map((p) => ({ user, path: p }))),
  { user: "ravi", path: consoleBuilt },
  { user: "ravi", path: "/console?cat=Polyclinics+%26+multi-specialty+centres&st=DXB&city=Business+Bay&lang=bi&build=1" },
  ...["math", "board", "filter", "track", "reach", "midsize", "healthcare", "markets"].map((s) => ({ user: "mia", path: `/playbook/${s}` })),
  { user: null, path: "/styleguide" }, // signed out: redirects to the login page, which is checked above
];

let bad = 0;
let checked = 0;
try {
  for (const sc of screens) for (const width of [390, 1280]) for (const scheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    if (sc.user) await signInCookie(ctx, root, app.url, sc.user);
    if (scheme === "dark") await ctx.addInitScript(() => localStorage.setItem("ok-theme", "dark"));
    const page = await ctx.newPage();
    await page.goto(app.url + sc.path, { waitUntil: "load" });
    await page.waitForTimeout(700);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const label = `${sc.user ?? "signed out"} ${sc.path} @${width} ${scheme}`;
    if (sw > width) { bad++; console.error(`${label}: horizontal page scroll (scrollWidth ${sw})`); }
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    for (const v of res.violations) {
      bad++;
      console.error(`${label}: ${v.id} (${v.impact}) — ${v.help}\n   ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n   ")}`);
    }
    checked++;
    await ctx.close();
  }

  // Keyboard: every control reachable by Tab shows a visible focus indicator
  for (const user of ["ravi", "ada"]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await signInCookie(ctx, root, app.url, user);
    const page = await ctx.newPage();
    await page.goto(app.url + (user === "ravi" ? "/today" : "/admin/users"), { waitUntil: "load" });
    await page.waitForTimeout(500);
    const hidden: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        return { tag: el.tagName + (el.textContent ? " " + el.textContent.trim().slice(0, 30) : ""), outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2 };
      });
      if (r && !r.outline) hidden.push(r.tag);
    }
    if (hidden.length) { bad++; console.error(`${user}: no visible focus ring on: ${hidden.join(" | ")}`); }
    await ctx.close();
  }
} finally {
  await browser.close();
  await app.stop();
  rmSync(root, { recursive: true, force: true });
}
console.log(bad ? `${bad} accessibility problem(s).` : `Accessibility: ${checked} screen/mode/width combinations pass axe (WCAG 2.1 A and AA); focus rings visible.`);
process.exit(bad ? 1 : 0);
