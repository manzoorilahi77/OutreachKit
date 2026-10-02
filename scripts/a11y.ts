// pnpm a11y: axe-core on every screen, light and dark, at 390 and 1280 (WCAG 2.x A and AA), plus keyboard checks.
// Signed-in screens use a session created through the local mail catcher.
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const base = `http://localhost:${process.env.PORT ?? 3100}`;
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const email = `a11y-${Date.now()}@example.com`;

async function link(to: string) {
  for (let i = 0; i < 40; i++) {
    const found = (await (await fetch(`${env.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent("to:" + to)}`)).json()) as { messages: { ID: string }[] };
    if (found.messages[0]) {
      const msg = (await (await fetch(`${env.MAILPIT_URL}/api/v1/message/${found.messages[0].ID}`)).json()) as { HTML: string };
      return /href="([^"]+)"/.exec(msg.HTML)![1]!.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("no email");
}

const browser = await chromium.launch();
const c0 = await browser.newContext();
const p0 = await c0.newPage();
await p0.goto(`${base}/login`, { waitUntil: "load" });
await p0.fill("#email", email);
await p0.getByRole("button", { name: "Email me a sign-in link" }).click();
await p0.getByText("We sent a sign-in link").waitFor();
await p0.goto(await link(email));
await p0.goto(`${base}/?cat=Fencing+%26+gates&st=TX&city=Austin&build=1`, { waitUntil: "load" });
await p0.waitForTimeout(500);
await p0.getByRole("button", { name: "Save this kit" }).click();
await p0.getByText("Saved.").waitFor();
await p0.goto(`${base}/kits`, { waitUntil: "load" });
const kitHref = (await p0.getByRole("link", { name: "Open" }).getAttribute("href"))!;
await p0.getByRole("link", { name: "Open" }).click();
await p0.getByRole("link", { name: "Create a lead from this kit" }).click();
await p0.waitForTimeout(500);
await p0.fill("#business_name", "Acme Fence Co");
await p0.getByRole("button", { name: "Add lead" }).click();
await p0.waitForURL(/\/leads\/[0-9a-f-]{36}$/);
const leadPath = new URL(p0.url()).pathname;
const state = await c0.storageState();
await c0.close();

const screens: { path: string; signedIn: boolean; prep?: (p: Page) => Promise<void> }[] = [
  { path: "/", signedIn: false },
  { path: "/?cat=Fencing+%26+gates&st=TX&city=Austin&build=1", signedIn: false },
  { path: "/playbook", signedIn: false },
  { path: "/playbook/math", signedIn: false },
  { path: "/playbook/board", signedIn: false },
  { path: "/playbook/filter", signedIn: false },
  { path: "/playbook/track", signedIn: false },
  { path: "/playbook/reach", signedIn: false },
  { path: "/styleguide", signedIn: false },
  { path: "/login", signedIn: false },
  { path: "/", signedIn: true },
  { path: "/playbook/track", signedIn: true },
  { path: "/account", signedIn: true },
  { path: "/kits", signedIn: true },
  { path: kitHref, signedIn: true },
  { path: "/leads", signedIn: true },
  { path: "/leads/new", signedIn: true },
  { path: leadPath, signedIn: true },
];

let bad = 0;
for (const sc of screens) for (const width of [390, 1280]) for (const scheme of ["light", "dark"] as const) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, ...(sc.signedIn ? { storageState: state } : {}) });
  if (scheme === "dark") await ctx.addInitScript(() => localStorage.setItem("ok-theme", "dark"));
  const page = await ctx.newPage();
  await page.goto(base + sc.path, { waitUntil: "load" });
  await page.waitForTimeout(600);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > width) { bad++; console.error(`${sc.path} @${width} ${scheme}: horizontal page scroll (scrollWidth ${sw})`); }
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  for (const v of res.violations) {
    bad++;
    console.error(`${sc.path} @${width} ${scheme}: ${v.id} (${v.impact}) — ${v.help}\n   ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n   ")}`);
  }
  await ctx.close();
}

// Keyboard: every control reachable by Tab shows a visible focus indicator
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForTimeout(400);
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
  if (hidden.length) { bad++; console.error("No visible focus ring on: " + hidden.join(" | ")); }
  await ctx.close();
}

await browser.close();
console.log(bad ? `${bad} accessibility problem(s).` : `Accessibility: ${screens.length * 4} screen/mode/width combinations pass axe (WCAG 2.1 A and AA); focus rings visible.`);
process.exit(bad ? 1 : 0);
