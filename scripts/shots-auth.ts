// pnpm shots:auth: signs in with the local mail catcher, seeds a kit and a lead, and screenshots the signed-in screens.
// Writes docs/screenshots/phase-07 (account, kits, login) and phase-08 (leads).
import { chromium, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

const base = `http://localhost:${process.env.PORT ?? 3100}`;
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const email = `shots-${Date.now()}@example.com`;

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

async function shoot(path: string, phase: string, name: string, prepare?: (p: Page) => Promise<void>, signedOut = false) {
  mkdirSync(`docs/screenshots/phase-${phase}`, { recursive: true });
  for (const width of [390, 1280]) for (const scheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, ...(signedOut ? {} : { storageState: state }) });
    const page = await ctx.newPage();
    await page.goto(base + path, { waitUntil: "load" });
    await page.waitForTimeout(500);
    if (prepare) await prepare(page);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > width) { console.error(`OVERFLOW ${path} @${width}: ${sw}`); process.exitCode = 1; }
    await page.screenshot({ path: `docs/screenshots/phase-${phase}/${name}-${width}-${scheme}.png`, fullPage: true });
    await ctx.close();
  }
}

// sign in once and keep the session
const ctx0 = await browser.newContext();
const p0 = await ctx0.newPage();
await p0.goto(`${base}/login?next=%2Faccount`, { waitUntil: "load" });
await p0.fill("#email", email);
await p0.getByRole("button", { name: "Email me a sign-in link" }).click();
await p0.getByText("We sent a sign-in link").waitFor();
await p0.goto(await link(email));
await p0.fill("#name", "Maria Lopez");
await p0.fill("#studio", "Lone Star Web");
await p0.fill("#demo_domain", "lonestarweb.com");
await p0.getByRole("button", { name: "Save details" }).click();
await p0.getByText("Saved.").waitFor();
// a saved kit and a lead
await p0.goto(`${base}/?cat=Fencing+%26+gates&st=TX&city=Austin&build=1`, { waitUntil: "load" });
await p0.waitForTimeout(500);
await p0.getByRole("button", { name: "Save this kit" }).click();
await p0.getByText("Saved.").waitFor();
await p0.goto(`${base}/kits`, { waitUntil: "load" });
await p0.getByRole("link", { name: "Open" }).click();
await p0.getByRole("link", { name: "Create a lead from this kit" }).click();
await p0.waitForTimeout(500);
await p0.fill("#business_name", "Acme Fence Co");
await p0.fill("#owner_first_name", "Sam");
await p0.fill("#phone", "+1 512 555 0100");
await p0.fill("#instagram_handle", "@acmefence");
for (let i = 0; i < 8; i++) await p0.locator('fieldset input[type="checkbox"]').nth(i).check();
await p0.getByRole("button", { name: "Add lead" }).click();
await p0.waitForURL(/\/leads\/[0-9a-f-]{36}$/);
await p0.waitForTimeout(500);
await p0.selectOption("#stage-select", "contacted");
await p0.getByRole("button", { name: "Move", exact: true }).click();
await p0.getByText("Moved.").waitFor();
const leadPath = new URL(p0.url()).pathname;
const kitHref = await (async () => { await p0.goto(`${base}/kits`, { waitUntil: "load" }); return await p0.getByRole("link", { name: "Open" }).getAttribute("href"); })();
const state = await ctx0.storageState();
await ctx0.close();

await shoot("/login", "07", "login", undefined, true);
await shoot("/account", "07", "account");
await shoot("/kits", "07", "kits");
await shoot(kitHref!, "07", "kit-view");
await shoot("/leads", "08", "leads");
await shoot("/leads/new", "08", "lead-new");
await shoot(leadPath, "08", "lead-detail");
await shoot("/#track", "08", "playbook-ratios", async (p) => { await p.locator("#track").scrollIntoViewIfNeeded(); });
await browser.close();
console.log("Signed-in screenshots written.");
