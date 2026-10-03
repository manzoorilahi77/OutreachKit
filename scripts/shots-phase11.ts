// pnpm shots:11 — the Field Kit v2 screenshots (docs/screenshots/phase-11/), element by element:
// the directions block side by side and stacked, the build prompt per direction, pricing, cross-sell tabs,
// the ladder, the Generic kit chip and the import preview. Expects the app on PORT (default 3100) and the local stack.
import { chromium, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { CATS } from "../src/lib/kit/categories";
import { kitSlug } from "../src/lib/kit-v2/types";

const base = `http://localhost:${process.env.PORT ?? 3100}`;
const dir = "docs/screenshots/phase-11";
mkdirSync(dir, { recursive: true });
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const fencing = "/?cat=Fencing+%26+gates&st=TX&city=Austin&build=1";

const browser = await chromium.launch();
async function open(width: number, scheme: "light" | "dark", path: string, storageState?: string) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, ...(storageState ? { storageState } : {}) });
  if (scheme === "dark") await ctx.addInitScript(() => localStorage.setItem("ok-theme", "dark"));
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("article", { name: "Field kit" }).waitFor().catch(() => {});
  return { ctx, page };
}
const shot = (page: Page, sel: string, name: string) => page.locator(sel).first().screenshot({ path: `${dir}/${name}.png` });

for (const width of [1280, 390])
  for (const scheme of ["light", "dark"] as const) {
    const { ctx, page } = await open(width, scheme, fencing);
    await shot(page, 'section[aria-label="directions"]', `directions-${width}-${scheme}`);
    await ctx.close();
  }

{
  const { ctx, page } = await open(1280, "light", fencing);
  for (const d of ["A", "B", "C"]) {
    await page.getByRole("radio", { name: new RegExp(`direction ${d}|: ${d},`) }).click();
    await shot(page, 'section[aria-label="prompt"]', `prompt-direction-${d.toLowerCase()}`);
  }
  await shot(page, 'section[aria-label="pricing"]', "pricing-table");
  await shot(page, 'section[aria-label="cross"]', "cross-sell-without-ai");
  await page.getByRole("tab", { name: "With AI" }).click();
  await shot(page, 'section[aria-label="cross"]', "cross-sell-with-ai");
  await shot(page, 'section[aria-label="ladder"]', "upsell-ladder");
  await shot(page, 'article[aria-label="Field kit"] > header', "header-category-kit");
  await ctx.close();
}

const generic = CATS.find((c) => !existsSync(`src/kits/${kitSlug(c.n)}.json`));
if (generic) {
  const { ctx, page } = await open(1280, "light", "/?" + new URLSearchParams({ cat: generic.n, st: "TX", city: "Austin", build: "1" }));
  await shot(page, 'article[aria-label="Field kit"] > header', "header-generic-kit");
  await ctx.close();
}

// The import preview needs a session: sign in through the local mail catcher.
{
  const email = `shots-${Date.now()}@example.com`;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/login?next=/leads/import`, { waitUntil: "load" });
  await page.fill("#email", email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.getByText("We sent a sign-in link").waitFor();
  let link = "";
  for (let i = 0; i < 40 && !link; i++) {
    const found = (await (await fetch(`${env.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent("to:" + email)}`)).json()) as { messages: { ID: string }[] };
    if (found.messages[0]) {
      const msg = (await (await fetch(`${env.MAILPIT_URL}/api/v1/message/${found.messages[0].ID}`)).json()) as { HTML: string };
      link = /href="([^"]+)"/.exec(msg.HTML)![1]!.replace(/&amp;/g, "&");
    } else await new Promise((r) => setTimeout(r, 250));
  }
  await page.goto(link);
  await page.waitForURL(/\/leads\/import/);
  await page.waitForTimeout(500);
  await page.setInputFiles("#csv", "tests/fixtures/leads-import-two-rows.csv");
  await page.getByText(/to add ·/).waitFor();
  await page.screenshot({ path: `${dir}/import-preview.png`, fullPage: true });
  await ctx.close();
}

await browser.close();
console.log(`Phase 11 screenshots written to ${dir}/`);
