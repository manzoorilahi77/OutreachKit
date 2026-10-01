// pnpm golden:record: drives the ORIGINAL page in a real browser for each fixture and saves what it
// builds (#kit text per section, plus the copy payloads) to golden/original/<name>.json.
// The snapshots are committed, so `pnpm test` needs no browser.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { FIXTURES } from "../golden/fixtures";
import { readSource } from "./lib/source";

mkdirSync("golden/original", { recursive: true });
const html = readSource().replace(/<base[^>]*>/, "");
const browser = await chromium.launch();
for (const [name, f] of Object.entries(FIXTURES)) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  const out = await page.evaluate((fx) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const g = globalThis as any;
    // `sel`, `CATS`, `STATES` and `el` are the original's own globals.
    const sel = (0, eval)("sel");
    const CATS = (0, eval)("CATS");
    const el = (0, eval)("el");
    sel.cat = CATS.find((c: any) => c.n === fx.cat);
    sel.dev = fx.device;
    sel.st = fx.st;
    sel.city = fx.city;
    el("yourName").value = fx.you ?? "";
    el("yourBrand").value = fx.brand ?? "";
    el("yourDomain").value = fx.domain ?? "";
    el("buildBtn").onclick();
    const kit = document.getElementById("kit")!;
    return {
      header: kit.querySelector(".kit-hd")!.textContent,
      sections: [...kit.querySelectorAll(".kit-sec")].map((s) => s.textContent),
      clips: [...(0, eval)("CLIP")],
      g: typeof g,
    };
  }, f);
  if (errors.length) throw new Error(`${name}: page errors: ${errors.join("; ")}`);
  const { g: _g, ...snapshot } = out;
  void _g;
  writeFileSync(`golden/original/${name}.json`, JSON.stringify({ input: f, ...snapshot }, null, 1) + "\n");
  console.log(`${name}: header + ${snapshot.sections.length} sections + ${snapshot.clips.length} copy payloads`);
}
await browser.close();
