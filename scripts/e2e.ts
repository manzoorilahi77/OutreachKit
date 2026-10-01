// pnpm e2e: drives the running app (PORT, default 3100) in a real browser.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = `http://localhost:${process.env.PORT ?? 3100}`;
const golden = JSON.parse(readFileSync("golden/original/fencing-austin-desktop.json", "utf8")) as { clips: string[]; sections: string[] };

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
  assert.equal(await kit.locator("section").count(), 17, "17 kit sections");
  assert.match(await kit.locator("h3").first().innerText(), /Fencing & gates — Austin, TX/);
  assert.match(page.url(), /cat=Fencing\+%26\+gates&st=TX&city=Austin/);

  // Copy the build prompt and check the clipboard holds exactly what the original builds.
  await kit.getByRole("button", { name: "Copy", exact: true }).first().click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), golden.clips[0]);
  // First opener, "line + link"
  await kit.getByRole("button", { name: "Copy line + link" }).first().click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), golden.clips[1]);
  // Opener count and message count
  assert.equal(await kit.locator('section[aria-label="openers"] li').count(), 15);
  console.log("console: build, URL sync, copy payloads match the original");

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

async function boardFlow() {
  await page.goto(base + "/", { waitUntil: "networkidle" });
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

await consoleFlow();
await boardFlow();
assert.deepEqual(errors, [], "no console errors");
await browser.close();
console.log("e2e passed");
