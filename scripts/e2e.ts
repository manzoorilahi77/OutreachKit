// pnpm e2e: drives the running app (PORT, default 3100) in a real browser.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { COLS } from "../src/data";
import { CATS } from "../src/lib/kit/categories";
import { buildContext, generateKit } from "../src/lib/kit/generate";
import { kitText } from "../src/lib/kit/text";
import { applyCategoryKit } from "../src/lib/kit-v2/apply";
import { kitSlug } from "../src/lib/kit-v2/types";
import type { CategoryKit } from "../src/lib/kit-v2/types";

const base = `http://localhost:${process.env.PORT ?? 3100}`;
// Fencing & gates has a category kit, so the console shows the v2 overlay; its goldens are golden/v2.
// The original's own payloads are still proven by the golden tests and by a category with no kit file below.
const fencingInput = { cat: "Fencing & gates", device: "desktop" as const, st: "TX" as const, city: "Austin" };
const fencingCk = JSON.parse(readFileSync("src/kits/fencing-gates.json", "utf8")) as CategoryKit;
const golden = kitText(applyCategoryKit(generateKit(fencingInput), buildContext(fencingInput), fencingCk, "b"));
const genericCat = CATS.find((c) => !existsSync(`src/kits/${kitSlug(c.n)}.json`));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
const page = await ctx.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

async function consoleFlow() {
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const build = page.getByRole("button", { name: "Build my field kit" });
  assert.equal(await build.isDisabled(), true, "build is disabled until the console is complete");

  await page.getByRole("button", { name: /^Fencing & gates/ }).click();
  await page.selectOption("#stateSel", "TX");
  await page.selectOption("#citySel", "Austin");
  assert.equal(await build.isEnabled(), true);
  await build.click();

  const kit = page.getByRole("article", { name: "Field kit" });
  await kit.waitFor();
  assert.equal(await kit.locator("section").count(), 18, "17 kit sections plus design directions");
  assert.match(await kit.locator("header").first().innerText(), /Category kit · Unreviewed/);
  assert.match(await kit.locator("h3").first().innerText(), /Fencing & gates — Austin, TX/);
  assert.match(page.url(), /cat=Fencing\+%26\+gates&st=TX&city=Austin&dev=desktop&dir=b/);

  // Copy the build prompt and check the clipboard holds exactly what the original builds.
  await kit.getByRole("button", { name: "Copy", exact: true }).first().click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), golden.clips[0]);
  // First opener: the DM button copies the line only; the second button adds the link (correction 2).
  await kit.getByRole("button", { name: "Copy DM line" }).first().click();
  const first = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(first, golden.clips[1]);
  assert.ok(!first.includes("https://"), "the DM line has no link");
  await kit.getByRole("button", { name: "Line + link (for reply or email)" }).first().click();
  const withLink = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(withLink, golden.clips[2]);
  assert.ok(withLink.startsWith(first) && withLink.includes("https://"));
  // Opener count and message count
  assert.equal(await kit.locator('section[aria-label="openers"] li').count(), 15);
  console.log("console: build, URL sync, copy payloads match the category kit (golden/v2)");

  // Directions: A → B → C changes the preview selection and the build prompt
  const prompt = () => kit.locator('section[aria-label="prompt"] pre').innerText();
  for (const [d, theme] of [["A", "C30"], ["B", "C39"], ["C", "C4"]] as const) {
    const radio = kit.getByRole("radio", { name: new RegExp(`direction ${d}|: ${d},`, "i") });
    await radio.click();
    assert.equal(await kit.getByRole("radio", { checked: true }).innerText(), `Using direction ${d}`);
    assert.match(await prompt(), new RegExp(`Set themeId: '${theme}'`));
    assert.match(page.url(), new RegExp(`dir=${d.toLowerCase()}`));
  }
  await kit.getByRole("radio", { checked: true }).press("ArrowLeft");
  assert.match(await kit.getByRole("radio", { checked: true }).innerText(), /Using direction B/, "arrow keys move the selection");
  assert.match(await kit.getByRole("status").first().innerText(), /Direction B selected/);
  // Cross-sell tabs
  await kit.getByRole("tab", { name: "With AI" }).click();
  assert.equal(await kit.getByRole("tabpanel").filter({ visible: true }).count(), 1);
  console.log("console: directions switch the preview and the build prompt; tabs work");

  // Download kit (.md)
  const [dl] = await Promise.all([page.waitForEvent("download"), kit.getByRole("button", { name: "Download kit (.md)" }).click()]);
  assert.equal(dl.suggestedFilename(), "fieldkit_fencing-gates_austin.md");
  const md = readFileSync((await dl.path())!, "utf8");
  assert.match(md, /^---\ncategory: "Fencing & gates"\n/);
  assert.match(md, /contentSource: "category"/);
  assert.match(md, /\n## Openers\n/);
  console.log("console: kit download");

  // A category with no kit file: the ported kit, unchanged, marked Generic kit
  if (genericCat) {
    const gi = { cat: genericCat.n, device: "desktop" as const, st: "TX" as const, city: "Austin" };
    const v1 = kitText(generateKit(gi));
    await page.goto(base + "/?" + new URLSearchParams({ cat: gi.cat, st: "TX", city: "Austin", dev: "desktop", build: "1" }), { waitUntil: "networkidle" });
    const gk = page.getByRole("article", { name: "Field kit" });
    await gk.waitFor();
    assert.equal(await gk.locator("section").count(), 17);
    assert.match(await gk.locator("header").first().innerText(), /Generic kit/);
    await gk.getByRole("button", { name: "Copy", exact: true }).first().click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), v1.clips[0], "the generic build prompt is the original's");
    assert.doesNotMatch(page.url(), /dir=/);
    console.log(`console: ${genericCat.n} has no kit file and shows the original kit, marked Generic kit`);
  } else console.log("console: every category has a kit file; the original layer is covered by the golden tests");

  // Reset and restore from the URL
  await page.getByRole("button", { name: "Reset" }).click();
  assert.equal(await page.getByRole("article", { name: "Field kit" }).count(), 0);
  await page.goto(base + "/?cat=Hair+salons+%26+suites&dev=mobile&st=OR&city=Beaverton&build=1", { waitUntil: "networkidle" });
  const kit2 = page.getByRole("article", { name: "Field kit" });
  await kit2.waitFor();
  assert.match(await kit2.locator("h3").first().innerText(), /Hair salons & suites — Beaverton, OR/);
  assert.match(await kit2.innerText(), /Phone-primary/);
  console.log("console: URL restores choices and builds");

  // A free-typed city
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Commercial janitorial/ }).click();
  await page.selectOption("#stateSel", "AR");
  await page.fill("#cityFree", "Siloam Springs");
  await page.getByRole("button", { name: "Build my field kit" }).click();
  await page.getByRole("article", { name: "Field kit" }).waitFor();
  assert.match(await page.getByRole("article", { name: "Field kit" }).innerText(), /Unlisted town/);
  console.log("console: free-typed city");
}

async function themeFlow() {
  // Light is the default even when the system prefers dark; dark is a manual choice that is remembered.
  const dark = await browser.newContext({ colorScheme: "dark" });
  const p = await dark.newPage();
  await p.goto(base + "/", { waitUntil: "load" });
  await p.waitForTimeout(400);
  const bg = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert.equal(await bg(), "rgb(247, 245, 242)", "light (Warm White) by default, whatever the system says");
  assert.equal(await p.evaluate(() => getComputedStyle(document.body).color), "rgb(44, 46, 51)");
  await p.getByRole("button", { name: "Dark mode" }).click();
  assert.equal(await bg(), "rgb(15, 42, 74)", "manual toggle to navy");
  await p.reload({ waitUntil: "load" });
  assert.equal(await bg(), "rgb(15, 42, 74)", "the choice is remembered");
  await p.getByRole("button", { name: "Light mode" }).click();
  assert.equal(await bg(), "rgb(247, 245, 242)");
  await dark.close();
  console.log("theme: light by default, manual dark toggle, remembered");
}

async function homeFlow() {
  // The Kit Console is the home page; the playbook is a set of section pages.
  await page.goto(base + "/", { waitUntil: "load" });
  assert.equal(await page.getByRole("heading", { name: "Kit Console", level: 2 }).count(), 1);
  assert.equal(await page.locator("section#math").count(), 0, "no playbook sections on the home page");
  await page.goto(base + "/playbook", { waitUntil: "load" });
  assert.equal(await page.locator('main ul > li a[href^="/playbook/"]').count(), 10, "ten section cards plus the console card");
  await page.getByRole("link", { name: /Read this section/ }).first().click();
  await page.waitForURL(/\/playbook\/math$/);
  await page.getByRole("link", { name: /Next · 02/ }).click();
  await page.waitForURL(/\/playbook\/choose$/);
  assert.equal(await page.getByRole("link", { name: /04\s+Field kit builder/ }).getAttribute("href"), "/");
  console.log("home: Kit Console first, playbook as section pages");
}

async function boardFlow() {
  await page.goto(base + "/playbook/board", { waitUntil: "networkidle" });
  const rows = page.locator('[aria-label="Category board"] tbody tr');
  assert.equal(await rows.count(), 124);
  const board = page.locator("#board");
  await board.getByRole("button", { name: "Tier A", exact: true }).click();
  const a = await rows.count();
  assert.ok(a > 0 && a < 124);
  await board.getByRole("button", { name: "Outdoor & Hardscape" }).click();
  assert.ok((await rows.count()) < a);
  await board.getByRole("button", { name: "All families" }).click();
  await board.getByRole("button", { name: "All tiers" }).click();
  await board.getByRole("button", { name: /^Category/ }).click();
  const names = await rows.locator("td:first-child").allInnerTexts();
  assert.deepEqual(names, [...names].sort((x, y) => x.localeCompare(y)), "sorted by name, ascending");
  console.log("board: filters and sort");
}

const env = Object.fromEntries(
  (existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

/** Reads the sign-in link out of the newest email to `to`, from the local mail catcher. */
async function signInLink(to: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const found = (await (await fetch(`${env.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent("to:" + to)}`)).json()) as { messages: { ID: string }[] };
    if (found.messages[0]) {
      const msg = (await (await fetch(`${env.MAILPIT_URL}/api/v1/message/${found.messages[0].ID}`)).json()) as { HTML: string; Subject: string };
      assert.equal(msg.Subject, "Your Famysys Outreach Kit sign-in link");
      const href = /href="([^"]+)"/.exec(msg.HTML)![1]!;
      return href.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("no sign-in email arrived");
}

async function signIn(email: string, next = "/") {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.getByText("We sent a sign-in link").waitFor();
  await page.goto(await signInLink(email));
}

/** Prefetching keeps the network busy, so wait for load plus a moment for hydration instead of networkidle. */
const settle = () => page.waitForTimeout(400);

async function accountFlow() {
  const email = `e2e-${Date.now()}@example.com`;

  // Signed out: the console works, and saving asks for a sign-in that returns to the same kit.
  await page.goto(base + "/?cat=Fencing+%26+gates&st=TX&city=Austin&build=1", { waitUntil: "load" });
  const signInHref = await page.getByRole("link", { name: "Sign in to save this kit" }).getAttribute("href");
  assert.match(signInHref!, /^\/login\?next=.*build%3D1/);
  assert.equal((await page.request.get(base + "/leads", { maxRedirects: 0 })).status(), 307, "/leads needs a sign-in");

  // Sign in with an emailed link and land back on the kit
  await signIn(email, "/?cat=Fencing+%26+gates&st=TX&city=Austin&build=1");
  await page.getByRole("article", { name: "Field kit" }).waitFor();
  assert.ok(await page.getByRole("link", { name: "Saved kits" }).isVisible(), "signed in");

  // Choose direction C, save the kit and find it in the list
  await page.getByRole("radio", { name: /: C,/ }).click();
  await page.getByRole("button", { name: "Save this kit" }).click();
  await page.getByText("Saved.").waitFor();
  await page.goto(base + "/kits", { waitUntil: "load" });
  await settle();
  assert.equal(await page.locator('[aria-label="Saved kits"] tbody tr').count(), 1);
  await page.getByRole("link", { name: "Open" }).click();
  await page.getByRole("article", { name: "Field kit" }).waitFor();
  assert.match(await page.locator("h3").first().innerText(), /Fencing & gates — Austin, TX/);
  assert.match(await page.getByRole("article").innerText(), /\{Your Name\}/, "placeholders until details are saved");
  assert.equal(await page.getByRole("radio", { checked: true }).innerText(), "Using direction C", "the saved direction");

  // Sign out and back in: the saved kit still opens with direction C
  const kitUrl = page.url();
  await page.goto(base + "/account", { waitUntil: "load" });
  await settle();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(base + "/");
  await signIn(email, new URL(kitUrl).pathname);
  await page.getByRole("article", { name: "Field kit" }).waitFor();
  assert.equal(await page.getByRole("radio", { checked: true }).innerText(), "Using direction C", "direction C survives a new session");
  assert.match(await page.locator('section[aria-label="prompt"] pre').innerText(), /Set themeId: 'C4'/);

  // Step 4 is filled once and reused
  await page.goto(base + "/account", { waitUntil: "load" });
  await settle();
  await page.fill("#name", "Maria");
  await page.fill("#studio", "Lone Star Web");
  await page.fill("#demo_domain", "https://lonestarweb.com/");
  await page.selectOption("#default_device", "mobile");
  await page.getByRole("button", { name: "Save details" }).click();
  await page.getByText("Saved.").waitFor();
  await page.goto(base + "/kits", { waitUntil: "load" });
  await settle();
  await page.getByRole("link", { name: "Open" }).click();
  const kitText = await page.getByRole("article").innerText();
  assert.match(kitText, /https:\/\/lonestarweb\.com\/austin\/\{business-name\}/);
  assert.match(kitText, /Maria/);
  await page.goto(base + "/", { waitUntil: "load" });
  await settle();
  assert.equal(await page.locator("#yourName").inputValue(), "Maria");
  assert.equal(await page.getByRole("button", { name: /Phone — native apps/ }).getAttribute("aria-pressed"), "true", "default device from the profile");
  console.log("account: sign in by emailed link, save a kit, profile reused in the console");
  return email;
}

async function leadsFlow() {
  // From the saved kit to a scored lead, moved to Contacted, with its Day 2 next action
  await page.goto(base + "/kits", { waitUntil: "load" });
  await settle();
  await page.getByRole("link", { name: "Open" }).click();
  await page.getByRole("link", { name: "Create a lead from this kit" }).click();
  await page.waitForURL(/\/leads\/new\?kit=/);
  await settle();
  assert.equal(await page.locator("#category").inputValue(), "Fencing & gates", "category comes from the kit");
  assert.equal(await page.locator("#city").inputValue(), "Austin");
  assert.equal(await page.locator("#state").inputValue(), "TX");
  await page.fill("#business_name", "Acme Fence Co");
  await page.fill("#phone", "+1 512 555 0100");
  const boxes = page.locator('fieldset input[type="checkbox"]');
  assert.equal(await boxes.count(), 10, "ten scorer checks");
  for (let i = 0; i < 8; i++) await boxes.nth(i).check();
  await page.getByText("8 / 10").first().waitFor();
  await page.getByText("Hot — build the demo").waitFor();
  await page.getByRole("button", { name: "Add lead" }).click();
  await page.waitForURL(/\/leads\/[0-9a-f-]{36}$/);
  const leadUrl = page.url();
  assert.match(await page.locator("h1").innerText(), /Acme Fence Co/);
  assert.match(await page.locator("header").last().innerText(), /8 \/ 10/);

  // Move to Contacted: Day 0 is today, so the next action is the Day 2 call
  await settle();
  await page.selectOption("#stage-select", "contacted");
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await page.getByText("Moved.").waitFor();
  const today = await page.evaluate(() => new Date().toLocaleDateString("en-CA"));
  const d = new Date(today + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 2);
  const day2 = d.toISOString().slice(0, 10);
  await page.reload({ waitUntil: "load" });
  assert.match(await page.locator("header").last().innerText(), new RegExp(`Next action:\\s*${day2}`), "Day 2 next action");
  assert.match(await page.locator("#seq-h + ol").innerText(), new RegExp(`Day 2\\s+${day2}\\s+Call the published business line`));
  const history = await page.locator("#hist-h + ol").innerText();
  assert.match(history, /Moved from Sourced to Contacted/);
  assert.match(history, /Instagram DM · Instagram or Facebook DM/);

  // Log the Day 2 call: the next action moves to Day 5
  await page.getByRole("button", { name: /Log it as done \(Call\)/ }).click();
  await page.waitForTimeout(800);
  await page.reload({ waitUntil: "load" });
  const d5 = new Date(today + "T00:00:00Z");
  d5.setUTCDate(d5.getUTCDate() + 5);
  assert.match(await page.locator("header").last().innerText(), new RegExp(`Next action:\\s*${d5.toISOString().slice(0, 10)}`), "Day 5 next action");

  // It shows on the list, filtered by stage
  await page.goto(base + "/leads?stage=contacted", { waitUntil: "load" });
  assert.equal(await page.locator('[aria-label="Leads"] tbody tr').count(), 1);

  // CSV: the exact 28-column header of the original, and the lead's row
  const csv = await (await page.request.get(base + "/leads/export.csv")).text();
  const lines = csv.trim().split("\r\n");
  assert.equal(lines[0], COLS.join(","));
  assert.equal(lines[0]!.split(",").length, 28);
  assert.equal(lines.length, 2);
  assert.match(lines[1]!, /Acme Fence Co/);
  assert.match(lines[1]!, /,8,Hot,/);
  assert.match(lines[1]!, /,Instagram DM,No,Contacted,/);

  // Section 09 shows the target next to "not enough data" below 100 leads
  await page.goto(base + "/playbook/track", { waitUntil: "load" });
  const ratios = await page.locator('[aria-label="The six ratios: planning target and your live ratio"]').innerText();
  assert.match(ratios, /Contacted → Replied\s+1 – 5%\s+Not enough data/);
  assert.match(ratios, /Profiles per hour\s+40 – 60\s+Not tracked/);
  console.log("leads: from a saved kit to a scored lead, Contacted, Day 2 next action, CSV header, live ratios");

  await page.goto(leadUrl, { waitUntil: "load" });
}

async function importFlow() {
  // The Cowork CSV reaches the tracker through /leads/import: preview, then confirm. Score and Tier come from the checks.
  await page.goto(base + "/leads/import", { waitUntil: "load" });
  await settle();
  await page.setInputFiles("#csv", "tests/fixtures/leads-import-two-rows.csv");
  await page.getByText("2 to add · 0 duplicates skipped · 0 with errors").waitFor();
  await page.getByRole("button", { name: "Import 2 leads" }).click();
  await page.getByText("Imported 2 leads.").waitFor();
  await page.goto(base + "/leads", { waitUntil: "load" });
  const rows = page.locator('[aria-label="Leads"] tbody tr');
  const cedar = await rows.filter({ hasText: "Cedar Line Fence Co" }).innerText();
  assert.match(cedar, /Hot/);
  assert.match(cedar, /9 \/ 10/);
  const gate = await rows.filter({ hasText: "Pflugerville Gate & Iron" }).innerText();
  assert.match(gate, /Warm/);
  assert.match(gate, /6 \/ 10/);
  // Importing the same file again adds nothing
  await page.goto(base + "/leads/import", { waitUntil: "load" });
  await settle();
  await page.setInputFiles("#csv", "tests/fixtures/leads-import-two-rows.csv");
  await page.getByText("0 to add · 2 duplicates skipped · 0 with errors").waitFor();
  console.log("import: two-row CSV previewed, imported, scored by the database; a re-import is all duplicates");
}

await consoleFlow();
await boardFlow();
await themeFlow();
await homeFlow();
if (env.NEXT_PUBLIC_SUPABASE_URL) { await accountFlow(); await leadsFlow(); await importFlow(); }
else console.log("account: skipped (no Supabase configured)");
assert.deepEqual(errors, [], "no console errors");
await browser.close();
console.log("e2e passed");
