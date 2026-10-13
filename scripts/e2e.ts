// pnpm e2e: ONE running app (port 5021) on a throwaway MySQL database, driven by two people in a real browser.
// Part 1 signs in as the owner and runs the Kit Console, board and theme checks.
// Part 2 is the team: the owner creates a BD; the BD signs in, is forced to change the temporary password, builds Roofing in
// Dallas, TX, saves it and adds a lead; the owner sees the lead at once; the BD can't see the owner's private lead; the owner
// resets the BD's password and the BD's session ends at the next click; five wrong passwords lock a name; the session cookie is
// Secure; and a clock offset shows a session open on day 13 and ended on day 14.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";
import { COLS } from "../src/data";
import { CATS, catalogFor } from "../src/lib/kit/categories";
import { buildContext, generateKit } from "../src/lib/kit/generate";
import { kitText } from "../src/lib/kit/text";
import { applyCategoryKit } from "../src/lib/kit-v2/apply";
import { kitSlug } from "../src/lib/kit-v2/types";
import type { CategoryKit } from "../src/lib/kit-v2/types";
import { COOKIE_NAME } from "../src/lib/auth/cookie";
import { hashPassword } from "../src/lib/auth/password";
import { LOCKED_ERROR, SIGNIN_ERROR } from "../src/lib/auth/signin";
import { createPool } from "../src/lib/db/pool";
import { createScratchDb } from "../src/lib/db/scratch";
import { initWorkspaceDb } from "../src/lib/store/mysqlBootstrap";
import { createMySqlStore } from "../src/lib/store/mysqlStore";
import { ensureBuild, startApp, type RunningApp } from "./lib/app";
import { loadLocalEnv } from "./lib/loadEnv";

const PORT = Number(process.env.E2E_PORT ?? process.env.PORT ?? 5021);
const OWNER_PASSWORD = "correct-horse-battery-1";

// Fencing & gates has a category kit, so the console shows the v2 overlay; its goldens are golden/v2.
// Step 4 starts from the account and the workspace, so the kit is built with the owner's name, the studio and the demo domain.
const DETAILS = { you: "Olive Owner", brand: "Famysys", domain: "famysys.com" };
const fencingInput = { cat: "Fencing & gates", device: "desktop" as const, st: "TX" as const, city: "Austin", ...DETAILS };
const fencingCk = JSON.parse(readFileSync("src/kits/fencing-gates.json", "utf8")) as CategoryKit;
const golden = kitText(applyCategoryKit(generateKit(fencingInput), buildContext(fencingInput), fencingCk, "b"));
const genericCat = CATS.find((c) => !existsSync(`src/kits/${kitSlug(c.n)}.json`));

loadLocalEnv();
ensureBuild();
const scratch = await createScratchDb("okit_e2e");
const pool = createPool(scratch.config, 4);
await initWorkspaceDb(pool, {
  workspaceName: "Famysys", studio: "Famysys", demoDomain: "famysys.com", username: "owner", fullName: "Olive Owner",
  passwordHash: await hashPassword(OWNER_PASSWORD), unusableTempHash: await hashPassword("nobody-knows-this"),
});
const SECRET = randomBytes(32).toString("hex");
let app: RunningApp | null = null;
const browser = await chromium.launch();
const errors: string[] = [];

const watch = (page: Page) => {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
};
const settle = (page: Page) => page.waitForTimeout(500);

async function signIn(page: Page, base: string, username: string, password: string) {
  await page.goto(base + "/login", { waitUntil: "load" });
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

try {
  app = await startApp({ db: scratch.config, port: PORT, secret: SECRET });
  const ob = app.url;

  // ---------------------------------------------------------------- Part 1: the console, board and theme (signed in as the owner)
  const octx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const op = await octx.newPage();
  watch(op);

  // Signed out, the only page is /login.
  assert.equal((await op.request.get(ob + "/console", { maxRedirects: 0 })).status(), 307, "/console needs a sign-in");
  assert.match((await op.request.get(ob + "/leads", { maxRedirects: 0 })).headers()["location"] ?? "", /\/login/);
  assert.equal((await op.request.get(ob + "/api/leadfinder")).status(), 401, "the API needs a sign-in too");
  await signIn(op, ob, "owner", "wrong password");
  await op.getByText(SIGNIN_ERROR).waitFor();
  await signIn(op, ob, "owner", OWNER_PASSWORD);
  await op.waitForURL(ob + "/platform");
  console.log("sign-in: one error for a wrong password; the owner lands on /platform");

  await op.goto(ob + "/console", { waitUntil: "networkidle" });
  const build = op.getByRole("button", { name: "Build my field kit" });
  assert.equal(await build.isDisabled(), true, "build is disabled until the console is complete");
  await op.getByRole("button", { name: /^Fencing & gates/ }).click();
  await op.selectOption("#stateSel", "TX");
  await op.selectOption("#citySel", "Austin");
  assert.equal(await build.isEnabled(), true);
  await build.click();

  const kit = op.getByRole("article", { name: "Field kit" });
  await kit.waitFor();
  assert.equal(await kit.locator("section").count(), 18, "17 kit sections plus design directions");
  assert.match(await kit.locator("header").first().innerText(), /Category kit · Unreviewed/);
  assert.match(await kit.locator("h3").first().innerText(), /Fencing & gates — Austin, TX/);
  assert.match(op.url(), /\/console\?cat=Fencing\+%26\+gates&st=TX&city=Austin&dev=desktop&dir=b/);
  assert.equal(await kit.getByRole("button", { name: "Save this kit" }).count(), 1, "the saved strip replaces the old Save button");

  await kit.getByRole("button", { name: "Copy", exact: true }).first().click();
  assert.equal(await op.evaluate(() => navigator.clipboard.readText()), golden.clips[0]);
  await kit.getByRole("button", { name: "Copy DM line" }).first().click();
  const first = await op.evaluate(() => navigator.clipboard.readText());
  assert.equal(first, golden.clips[1]);
  assert.ok(!first.includes("https://"), "the DM line has no link");
  await kit.getByRole("button", { name: "Line + link (for reply or email)" }).first().click();
  const withLink = await op.evaluate(() => navigator.clipboard.readText());
  assert.equal(withLink, golden.clips[2]);
  assert.ok(withLink.startsWith(first) && withLink.includes("https://"));
  assert.equal(await kit.locator('section[aria-label="openers"] li').count(), 15);
  console.log("console: build, URL sync, copy payloads match the category kit (golden/v2)");

  const prompt = () => kit.locator('section[aria-label="prompt"] pre').innerText();
  for (const [d, theme] of [["A", "C30"], ["B", "C39"], ["C", "C4"]] as const) {
    await kit.getByRole("radio", { name: new RegExp(`direction ${d}|: ${d},`, "i") }).click();
    assert.equal(await kit.getByRole("radio", { checked: true }).innerText(), `Using direction ${d}`);
    assert.match(await prompt(), new RegExp(`Set themeId: '${theme}'`));
    assert.match(op.url(), new RegExp(`dir=${d.toLowerCase()}`));
  }
  await kit.getByRole("radio", { checked: true }).press("ArrowLeft");
  assert.match(await kit.getByRole("radio", { checked: true }).innerText(), /Using direction B/, "arrow keys move the selection");
  await kit.getByRole("tab", { name: "With AI" }).click();
  assert.equal(await kit.getByRole("tabpanel").filter({ visible: true }).count(), 1);
  const [dl] = await Promise.all([op.waitForEvent("download"), kit.getByRole("button", { name: "Download kit (.md)" }).click()]);
  assert.equal(dl.suggestedFilename(), "fieldkit_fencing-gates_austin.md");
  assert.match(readFileSync((await dl.path())!, "utf8"), /^---\ncategory: "Fencing & gates"\n/);
  console.log("console: directions switch the preview and the build prompt; tabs; download");

  if (genericCat) {
    const gi = { cat: genericCat.n, device: "desktop" as const, st: "TX" as const, city: "Austin", ...DETAILS };
    const v1 = kitText(generateKit(gi));
    await op.goto(ob + "/console?" + new URLSearchParams({ cat: gi.cat, st: "TX", city: "Austin", dev: "desktop", build: "1" }), { waitUntil: "networkidle" });
    const gk = op.getByRole("article", { name: "Field kit" });
    await gk.waitFor();
    assert.equal(await gk.locator("section").count(), 17);
    assert.match(await gk.locator("header").first().innerText(), /Generic kit/);
    await gk.getByRole("button", { name: "Copy", exact: true }).first().click();
    assert.equal(await op.evaluate(() => navigator.clipboard.readText()), v1.clips[0], "the generic build prompt is the original's");
    console.log(`console: ${genericCat.n} has no kit file and shows the original kit, marked Generic kit`);
  }

  await op.goto(ob + "/console", { waitUntil: "networkidle" });
  await op.getByRole("button", { name: /^Commercial janitorial/ }).click();
  await op.selectOption("#stateSel", "AR");
  await op.fill("#cityFree", "Siloam Springs");
  await op.getByRole("button", { name: "Build my field kit" }).click();
  assert.match(await op.getByRole("article", { name: "Field kit" }).innerText(), /Unlisted town/);
  assert.equal(await op.locator("#yourName").inputValue(), "Olive Owner", "Step 4 starts from the account and the workspace");
  assert.equal(await op.locator("#yourBrand").inputValue(), "Famysys");
  assert.equal(await op.locator("#yourDomain").inputValue(), "famysys.com");
  console.log("console: free-typed city; Step 4 comes from the account and the workspace");

  await op.goto(ob + "/playbook/board", { waitUntil: "networkidle" });
  const rows = op.locator('[aria-label="Category board"] tbody tr');
  const smallUS = catalogFor("small", "US").length;
  assert.equal(await rows.count(), smallUS);
  const board = op.locator("#board");
  await board.getByRole("button", { name: "Tier A", exact: true }).click();
  const a = await rows.count();
  assert.ok(a > 0 && a < smallUS);
  await board.getByRole("button", { name: "All tiers" }).click();
  await board.getByRole("tab", { name: /^Mid-size/ }).click();
  assert.equal(await rows.count(), catalogFor("mid", "US").length, "the Mid-size tab lists the mid-size categories");
  await board.getByRole("tab", { name: /^Small business/ }).click();
  await board.locator("#board-country").selectOption("AE");
  assert.equal(await rows.count(), catalogFor("small", "AE").length, "the UAE hides trades that don't exist there");
  assert.equal(await rows.filter({ hasText: "Snow & ice management" }).count(), 0);
  console.log("board: filters, size tabs, country");

  await op.goto(ob + "/console", { waitUntil: "networkidle" });
  await op.selectOption("#countrySel", "AE");
  await op.getByRole("tab", { name: /^Mid-size/ }).click();
  await op.getByRole("button", { name: /^Polyclinics & multi-specialty centres/ }).click();
  await op.selectOption("#stateSel", "DXB");
  await op.selectOption("#citySel", "Business Bay");
  await op.getByRole("radio", { name: /Arabic \(RTL\)/ }).check();
  await op.getByRole("button", { name: "Build my field kit" }).click();
  const uae = op.getByRole("article", { name: "Field kit" });
  await uae.waitFor();
  const uaeText = await uae.innerText();
  assert.match(uaeText, /Business Bay, Dubai/);
  assert.match(uaeText, /AED \d/);
  assert.match(uaeText, /Mid-size/);
  assert.match(uaeText, /dir="rtl"/);
  console.log("console: UAE, mid-size, Arabic build prompt, prices in AED");

  await op.goto(ob + "/playbook", { waitUntil: "load" });
  assert.equal(await op.locator('main ul > li a[href^="/playbook/"]').count(), 13, "thirteen section cards plus the console card");
  assert.equal(await op.locator('main ul > li a[href="/console"]').count(), 1);
  await op.getByRole("link", { name: /Read this section/ }).first().click();
  await op.waitForURL(/\/playbook\/math$/);
  console.log("playbook: section pages");

  const dark = await browser.newContext({ colorScheme: "dark" });
  const dp = await dark.newPage();
  await dp.goto(ob + "/login", { waitUntil: "load" });
  await dp.waitForTimeout(400);
  const bg = () => dp.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert.equal(await bg(), "rgb(247, 245, 242)", "light (Warm White) by default, whatever the system says");
  await dp.getByRole("button", { name: "Dark mode" }).click();
  assert.equal(await bg(), "rgb(15, 42, 74)", "manual toggle to navy");
  await dp.reload({ waitUntil: "load" });
  assert.equal(await bg(), "rgb(15, 42, 74)", "the choice is remembered");
  await dark.close();
  console.log("theme: light by default, manual dark toggle, remembered");
  assert.deepEqual(errors, [], "no console errors in part 1");

  // ---------------------------------------------------------------- Part 2: two people on one server
  // The owner creates a team and a BD.
  await op.goto(ob + "/admin/teams", { waitUntil: "networkidle" });
  await op.getByRole("button", { name: "Add a team" }).click();
  await op.locator('input[name="name"]').last().fill("Team A");
  await op.getByRole("button", { name: "Save teams" }).click();
  await op.getByText("Teams saved.").waitFor();

  await op.goto(ob + "/platform/users", { waitUntil: "networkidle" });
  await op.fill("#nu-name", "Ravi Rao");
  assert.equal(await op.inputValue("#nu-username"), "ravi.rao", "the username is suggested from the name");
  await op.selectOption("#nu-role", "bd");
  await op.selectOption("#nu-team", "team-a");
  await op.getByRole("button", { name: "Create user" }).click();
  const username = (await op.getByTestId("cred-username").innerText()).trim();
  const tempPassword = (await op.getByTestId("cred-password").innerText()).trim();
  assert.equal(username, "ravi.rao");
  assert.match(tempPassword, /^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
  await op.getByRole("button", { name: "I've shared it" }).click();
  assert.equal(await op.getByTestId("cred-password").count(), 0, "the password is shown once");
  const [stored] = await pool.query<import("mysql2/promise").RowDataPacket[]>("SELECT temp_password_hash FROM users WHERE username = ?", [username]);
  assert.match(stored[0]!.temp_password_hash as string, /^\$2[aby]\$/);
  assert.notEqual(stored[0]!.temp_password_hash, tempPassword, "only the hash is saved");
  // A password typed in the form becomes the temporary one.
  await op.fill("#nu-name", "Tess Typed");
  await op.fill("#nu-password", "short");
  await op.getByRole("button", { name: "Create user" }).click();
  assert.equal(await op.getByTestId("cred-password").count(), 0, "the browser refuses a password under 10 characters");
  await op.fill("#nu-password", "Typed-Create-Pass-1");
  await op.getByRole("button", { name: "Create user" }).click();
  assert.equal((await op.getByTestId("cred-password").innerText()).trim(), "Typed-Create-Pass-1", "the typed password is the one shown");
  await op.getByRole("button", { name: "I've shared it" }).click();
  console.log("owner: created a BD, the password was shown once, a typed password is accepted");

  // The BD signs in from another browser: no clone, no sync, just the address.
  const tb = ob;
  const tctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const tp = await tctx.newPage();
  await signIn(tp, tb, username, tempPassword);
  await tp.waitForURL(tb + "/account/password");
  const cookie = (await tctx.cookies(tb)).find((c) => c.name === COOKIE_NAME);
  assert.ok(cookie, "a session cookie was set");
  assert.equal(cookie!.secure, true, "the session cookie is Secure");
  assert.equal(cookie!.httpOnly, true, "the session cookie is HttpOnly");
  assert.equal((await tp.request.get(tb + "/today", { maxRedirects: 0 })).headers()["location"]?.endsWith("/account/password"), true, "every page redirects to the password page");
  await tp.fill("#new", "short");
  await tp.fill("#confirm", "short");
  await tp.getByRole("button", { name: "Set my password" }).click();
  assert.equal(new URL(tp.url()).pathname, "/account/password", "the browser refuses fewer than 10 characters");
  await tp.fill("#new", "ravi.rao-is-my-name");
  await tp.fill("#confirm", "ravi.rao-is-my-name");
  await tp.getByRole("button", { name: "Set my password" }).click();
  await tp.getByText("Don't put your username in your password.").waitFor();
  const ownPassword = "ravi-own-password-1";
  await tp.fill("#new", ownPassword);
  await tp.fill("#confirm", ownPassword);
  await tp.getByRole("button", { name: "Set my password" }).click();
  await tp.waitForURL(tb + "/today");
  const [prof] = await pool.query<import("mysql2/promise").RowDataPacket[]>("SELECT password_hash FROM profiles WHERE username = ?", [username]);
  assert.match(prof[0]!.password_hash as string, /^\$2[aby]\$/, "own password stored as a hash");
  assert.notEqual(prof[0]!.password_hash, ownPassword);
  console.log("teammate: signed in with the temporary password, was forced to set their own, landed on /today; the cookie is Secure and HttpOnly");

  // The BD builds Roofing in Dallas, TX, saves it and adds a lead.
  watch(tp);
  await tp.goto(tb + "/console?cat=Roofing&st=TX&city=Dallas&build=1", { waitUntil: "networkidle" });
  await tp.getByRole("button", { name: "Save this kit" }).click();
  const strip = tp.getByRole("region", { name: "Saved kit" });
  await strip.waitFor();
  assert.match(await strip.innerText(), /Roofing · Dallas, TX/);
  assert.match(await strip.innerText(), /Active/);
  assert.match(await strip.innerText(), /Team A/);
  assert.doesNotMatch(await strip.innerText(), /sync/i, "there is no sync any more");
  assert.match(await strip.innerText(), /Nobody else has saved Roofing in Dallas, TX yet\. Duplicate businesses are blocked\./);
  await strip.getByRole("link", { name: "Add the first lead" }).click();
  await tp.waitForURL(/\/leads\/new\?kit=/);
  await settle(tp);
  assert.equal(await tp.locator("#category").inputValue(), "Roofing", "category comes from the kit");
  assert.equal(await tp.locator("#city").inputValue(), "Dallas");
  assert.equal(await tp.locator("#state").inputValue(), "TX");
  await tp.fill("#business_name", "Smith Roofing");
  await tp.fill("#phone", "(214) 555-0101");
  const boxes = tp.locator('fieldset input[type="checkbox"]');
  assert.equal(await boxes.count(), 10, "ten scorer checks");
  for (let i = 0; i < 8; i++) await boxes.nth(i).check();
  await tp.getByText("8 / 10").first().waitFor();
  await tp.getByRole("button", { name: "Add lead" }).click();
  await tp.waitForURL(/\/leads\/[0-9a-f-]{36}$/);
  assert.match(await tp.locator("h1").innerText(), /Smith Roofing/);

  // Move to Contacted: Day 0 is today, the next action is the Day 2 call.
  await settle(tp);
  await tp.selectOption("#stage-select", "contacted");
  await tp.getByRole("button", { name: "Move", exact: true }).click();
  await tp.getByText("Moved.").waitFor();
  const today = await tp.evaluate(() => new Date().toLocaleDateString("en-CA"));
  const d = new Date(today + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 2);
  const day2 = d.toISOString().slice(0, 10);
  await tp.reload({ waitUntil: "load" });
  assert.match(await tp.locator("header").last().innerText(), new RegExp(`Next action:\\s*${day2}`), "Day 2 next action");
  assert.match(await tp.locator("#hist-h + ol").innerText(), /Moved from Sourced to Contacted/);
  await tp.getByRole("button", { name: /Log it as done \(Call\)/ }).click();
  await tp.waitForTimeout(800);

  // The same business again is refused, naming the holder.
  await tp.goto(tb + "/leads/new", { waitUntil: "load" });
  await settle(tp);
  await tp.fill("#business_name", "Smith Roofing LLC");
  await tp.fill("#city", "Dallas");
  await tp.getByRole("button", { name: "Add lead" }).click();
  await tp.getByText("Smith Roofing LLC is already your lead.").waitFor();

  // CSV: the exact 28-column header, and the audit trail.
  const csv = await (await tp.request.get(tb + "/leads/export.csv")).text();
  const lines = csv.trim().split("\r\n");
  assert.equal(lines[0], COLS.join(","));
  assert.equal(lines[0]!.split(",").length, 28);
  assert.equal(lines.length, 2);
  assert.match(lines[1]!, /,8,Hot,/);
  const [audited] = await pool.query<import("mysql2/promise").RowDataPacket[]>("SELECT COUNT(*) AS n FROM audit_log WHERE actor = ? AND action = 'leads.export'", [username]);
  assert.equal(Number(audited[0]!.n), 1, "the export is in the audit log");

  // Import: the two-row CSV is previewed and imported; a re-import is all duplicates.
  await tp.goto(tb + "/leads/import", { waitUntil: "load" });
  await settle(tp);
  await tp.setInputFiles("#csv", "tests/fixtures/leads-import-two-rows.csv");
  await tp.getByText("2 to add · 0 duplicates skipped · 0 with errors").waitFor();
  await tp.getByRole("button", { name: "Import 2 leads" }).click();
  await tp.getByText("Imported 2 leads.").waitFor();
  await tp.goto(tb + "/leads/import", { waitUntil: "load" });
  await settle(tp);
  await tp.setInputFiles("#csv", "tests/fixtures/leads-import-two-rows.csv");
  await tp.getByText("0 to add · 2 duplicates skipped · 0 with errors").waitFor();
  console.log("teammate: kit saved with the strip, lead added, Contacted, Day 2 next action, duplicate refused, CSV header, import");

  // The leads table: S.No, sortable headers and pages.
  await tp.goto(tb + "/leads", { waitUntil: "load" });
  await settle(tp);
  const table = tp.locator('[role="region"][aria-label="Leads"]');
  assert.equal(await table.locator("thead th").first().innerText(), "S.No");
  assert.deepEqual(await table.locator("tbody tr td:first-child").allInnerTexts(), ["1", "2", "3"]);
  await table.getByRole("button", { name: "Business" }).click();
  assert.equal(await table.locator('th[aria-sort="ascending"]').count(), 1);
  const names = await table.locator("tbody tr td:nth-child(2)").allInnerTexts();
  assert.deepEqual(names, [...names].sort((x, y) => x.localeCompare(y)), "sorted by business, ascending");
  await table.getByRole("button", { name: "Business" }).click();
  assert.deepEqual(await table.locator("tbody tr td:nth-child(2)").allInnerTexts(), [...names].reverse(), "descending");
  assert.match(await tp.getByText(/Showing 1–3 of 3/).innerText(), /3/);
  await tp.getByLabel("Rows per page").selectOption("10");
  await tp.getByRole("button", { name: "Next", exact: true }).isDisabled().then((d) => assert.equal(d, true, "one page only"));

  // A BD sees no admin screens.
  for (const p of ["/admin", "/platform", "/team", "/queue", "/admin/users"]) {
    const loc = (await tp.request.get(tb + p, { maxRedirects: 0 })).headers()["location"] ?? "";
    assert.ok(loc.endsWith("/today"), `${p} sends a BD home, got ${loc}`);
  }
  assert.deepEqual(errors, [], "no console errors for the BD");

  // The owner sees the BD's lead at once: nobody syncs anything.
  await op.goto(ob + "/leads", { waitUntil: "networkidle" });
  assert.equal(await op.getByRole("link", { name: "Smith Roofing" }).count(), 1, "the owner sees the BD's lead straight away");
  assert.equal(await op.getByRole("link", { name: "Cedar Line Fence Co" }).count(), 1);
  await op.goto(ob + "/team", { waitUntil: "networkidle" });
  assert.match(await op.locator('[role="region"][aria-label="Pipeline by BD"]').innerText(), /Ravi Rao/);
  // A second person is blocked from adding the same business, by name.
  await op.goto(ob + "/leads/new", { waitUntil: "load" });
  await settle(op);
  await op.fill("#business_name", "Smith Roofing");
  await op.fill("#phone", "2145550101");
  await op.getByRole("button", { name: "Add lead" }).click();
  await op.getByText("Smith Roofing is already Ravi's lead.").waitFor();
  console.log("owner: sees the lead in Team at once, and adding the same business is refused: “Smith Roofing is already Ravi's lead.”");

  // The BD cannot read the owner's lead: the server never sends it.
  const secret = await createMySqlStore({ username: "owner", role: "super_admin", team: null }, pool).createLead({
    business_name: "Owner Private Fencing", owner_first_name: "", category: "Fencing & gates", city: "Mesa", state: "AZ", phone: "4805550199", email: "", instagram_handle: "",
    facebook_page: "", google_maps_url: "", website_found: null, website_url: "", site_verdict: "", google_review_count: null, google_rating: null, followers: null,
    last_post_date: null, demo_url: "", demo_built_date: null, first_contact_date: null, channel: null, notes: "Only the owner should see this", checks: {},
  });
  assert.equal((await tp.request.get(`${tb}/leads/${secret.id}`)).status(), 404, "a BD asking for the owner's lead by its id gets a 404");
  await tp.goto(tb + "/leads", { waitUntil: "load" });
  assert.equal(await tp.getByText("Owner Private Fencing").count(), 0, "it isn't in the BD's list");
  const bdCsv = await tp.request.get(tb + "/leads/export.csv");
  assert.equal(bdCsv.status(), 200);
  assert.ok(!(await bdCsv.text()).includes("Owner Private Fencing"), "nor in the BD's export");
  console.log("isolation: a BD can't open, list or export the owner's lead");

  // The kit workspace shows who else works the territory.
  await op.goto(ob + "/console?cat=Roofing&st=TX&city=Dallas&build=1", { waitUntil: "networkidle" });
  await op.getByRole("button", { name: "Save this kit" }).click();
  await op.getByRole("region", { name: "Saved kit" }).waitFor();
  assert.match(await op.getByRole("region", { name: "Saved kit" }).innerText(), /Also working Roofing in Dallas, TX: Ravi \(\d+ leads?\)/);

  // Five wrong passwords lock a name; the sixth try says so, even with the right password.
  const brute = await browser.newContext();
  const bp = await brute.newPage();
  for (let i = 0; i < 5; i++) { await signIn(bp, tb, "nobody.here", "wrong password " + i); await bp.getByText(SIGNIN_ERROR).waitFor(); }
  await signIn(bp, tb, "nobody.here", "wrong password 6");
  await bp.getByText(LOCKED_ERROR).waitFor();
  await brute.close();
  console.log("sign-in: five wrong passwords lock the name for 15 minutes");

  // The owner resets the BD's password: the BD's session ends at the next click.
  await op.goto(ob + "/platform/users", { waitUntil: "networkidle" });
  await op.getByRole("button", { name: "Manage Ravi Rao" }).click();
  await op.getByRole("button", { name: "Reset password" }).click();
  assert.match(await op.getByText(/Reset Ravi Rao.s password\?/).innerText(), /set their own/);
  await op.fill('[id="r-pw-ravi.rao"]', "Typed-Reset-Pass-9");
  await op.getByRole("button", { name: "Yes, do it" }).click();
  const newTemp = (await op.getByTestId("cred-password").innerText()).trim();
  assert.equal(newTemp, "Typed-Reset-Pass-9", "the owner chose the new temporary password");
  await op.getByRole("button", { name: "I've shared it" }).click();
  await tp.goto(tb + "/today", { waitUntil: "load" });
  await tp.waitForURL(/\/login/);
  await signIn(tp, tb, username, ownPassword);
  await tp.getByText(SIGNIN_ERROR).waitFor();
  await signIn(tp, tb, username, newTemp);
  await tp.waitForURL(tb + "/account/password");
  await tp.fill("#new", "ravi-second-password");
  await tp.fill("#confirm", "ravi-second-password");
  await tp.getByRole("button", { name: "Set my password" }).click();
  await tp.waitForURL(tb + "/today");
  console.log("owner: reset the BD's password; the BD's session ended at the next click; the old password stopped working; the new temporary one works once");

  // A suspension ends the session too, and lifting it brings the person back to the sign-in page.
  await op.goto(ob + "/platform/users", { waitUntil: "networkidle" });
  await op.getByRole("button", { name: "Manage Ravi Rao" }).click();
  await op.getByRole("button", { name: "Pause" }).click();
  await op.fill('[id="s-reason-ravi.rao"]', "On leave");
  await op.getByRole("button", { name: "Yes, do it" }).click();
  await op.getByText("Ravi Rao is paused.").waitFor();
  await tp.goto(tb + "/today", { waitUntil: "load" });
  await tp.waitForURL(/\/no-access/);
  await op.goto(ob + "/platform/users", { waitUntil: "networkidle" });
  await op.getByRole("button", { name: "Manage Ravi Rao" }).click();
  await op.getByRole("button", { name: "Turn on" }).click();
  await op.getByRole("button", { name: "Yes, do it" }).click();
  await op.getByText("Ravi Rao can sign in again.").waitFor();
  await tp.goto(tb + "/today", { waitUntil: "load" });
  await tp.waitForURL(/\/login/);
  console.log("owner: paused the BD, who was refused at the next click; turned them back on, and they sign in again");

  // The clock: a session is open on day 13 and ended on day 14. Same database, same secret, a new start with the clock moved.
  await signIn(tp, tb, username, "ravi-second-password");
  await tp.waitForURL(tb + "/today");
  const bdCookies = await tctx.cookies(tb);
  const DAY = 86_400_000;
  for (const [offset, expected] of [[13 * DAY + 23 * 3_600_000, "/today"], [14 * DAY + 60_000, "/login"]] as const) {
    await app.stop();
    app = await startApp({ db: scratch.config, port: PORT, secret: SECRET, clockOffsetMs: offset });
    await tctx.clearCookies();
    await tctx.addCookies(bdCookies);
    await tp.goto(app.url + "/today", { waitUntil: "load" });
    assert.equal(new URL(tp.url()).pathname, expected, `at +${(offset / DAY).toFixed(2)} days the BD lands on ${expected}`);
  }
  console.log("sessions: open on day 13, ended on day 14");

  await tctx.close();
  await octx.close();
  console.log("e2e passed");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  await app?.stop();
  await pool.end();
  await scratch.drop();
}
