// pnpm golden:sweep: a wider differential check than the committed fixtures. Builds the kit in the ORIGINAL page
// and in the TS port for every category x device, cycling through all states and city positions
// (including a free-typed city), and compares the section text and copy payloads.
import { chromium } from "@playwright/test";
import { STATES } from "../src/data";
import { CATS } from "../src/lib/kit/categories";
import { generateKit } from "../src/lib/kit/generate";
import { kitText } from "../src/lib/kit/text";
import type { KitInput } from "../src/lib/kit/types";
import { readSource } from "./lib/source";

const codes = Object.keys(STATES) as (keyof typeof STATES)[];
const inputs: KitInput[] = [];
CATS.forEach((c, i) =>
  (["desktop", "mobile"] as const).forEach((device, j) => {
    const st = codes[(i * 2 + j) % codes.length]!;
    const cities = STATES[st][1].split("|");
    const pos = (i * 3 + j * 5) % (cities.length + 1);
    inputs.push({
      cat: c.n, device, st, city: pos === cities.length ? "Free Typed Town" : cities[pos]!,
      ...(i % 4 === 0 ? { you: "Sam", brand: "Studio X", domain: "http://studiox.io//" } : {}),
    });
  }),
);

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.setContent(readSource().replace(/<base[^>]*>/, ""), { waitUntil: "domcontentloaded" });
const originals = await page.evaluate((all) => {
  const sel = (0, eval)("sel"), CATS = (0, eval)("CATS"), el = (0, eval)("el");
  return all.map((fx) => {
    sel.cat = CATS.find((c: { n: string }) => c.n === fx.cat);
    sel.dev = fx.device; sel.st = fx.st; sel.city = fx.city;
    el("yourName").value = fx.you ?? ""; el("yourBrand").value = fx.brand ?? ""; el("yourDomain").value = fx.domain ?? "";
    el("buildBtn").onclick();
    const kit = document.getElementById("kit")!;
    return {
      header: kit.querySelector(".kit-hd")!.textContent,
      sections: [...kit.querySelectorAll(".kit-sec")].map((s) => s.textContent),
      clips: [...(0, eval)("CLIP")],
    };
  });
}, inputs);
await browser.close();

let bad = 0;
inputs.forEach((input, i) => {
  const got = kitText(generateKit(input));
  const want = originals[i]!;
  const problems: string[] = [];
  if (got.header !== want.header) problems.push("header");
  want.sections.forEach((s, k) => { if (got.sections[k] !== s) problems.push(`section ${k}`); });
  if (got.sections.length !== want.sections.length) problems.push("section count");
  if (JSON.stringify(got.clips) !== JSON.stringify(want.clips)) problems.push("clips");
  if (problems.length) { bad++; console.error(`MISMATCH ${input.cat} / ${input.city}, ${input.st} / ${input.device}: ${problems.join(", ")}`); }
});
console.log(`${inputs.length} kits compared, ${bad} mismatched.`);
process.exit(bad ? 1 : 0);
