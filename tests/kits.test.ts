import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { checkKits } from "../scripts/lib/kits";
import { ALL_CATS as CATS } from "@/lib/kit/categories";
import { kitSlug } from "@/lib/kit-v2/types";
import type { CategoryKit } from "@/lib/kit-v2/types";

describe("pnpm kits:check", () => {
  const result = checkKits();
  it("passes on src/kits", () => {
    expect(result.problems.map((p) => `${p.file} → ${p.rule} → ${p.text}`)).toEqual([]);
  });
  it("checked every file", () => expect(result.reports.length).toBeGreaterThanOrEqual(3));
});

describe("kitSlug", () => {
  it("matches the schema's definition", () => {
    expect(kitSlug("Fencing & gates")).toBe("fencing-gates");
    expect(kitSlug("Hair salons & suites")).toBe("hair-salons-suites");
    expect(kitSlug("Commercial janitorial")).toBe("commercial-janitorial");
  });
  it("is unique across all categories on the board", () => {
    const slugs = CATS.map((c) => kitSlug(c.n));
    expect(new Set(slugs).size).toBe(CATS.length);
  });
});

// Each rule has to actually fire: break one thing in a copy of a pilot and expect that rule.
describe("the checker catches", () => {
  const base = JSON.parse(readFileSync("src/kits/fencing-gates.json", "utf8")) as CategoryKit;
  const dirs: string[] = [];
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
  const rulesFor = (mutate: (k: CategoryKit) => void) => {
    const k = structuredClone(base);
    mutate(k);
    const dir = mkdtempSync(join(tmpdir(), "kits-"));
    dirs.push(dir);
    writeFileSync(join(dir, "fencing-gates.json"), JSON.stringify(k));
    return new Set(checkKits(dir).problems.map((p) => p.rule));
  };

  it.each<[string, (k: CategoryKit) => void]>([
    ["schema", (k) => { k.openers.pop(); }],
    ["identity", (k) => { k.slug = "fencing"; }],
    ["directions", (k) => { k.designDirections[1]!.themeId = k.designDirections[0]!.themeId; }],
    ["contrast", (k) => { k.designDirections[0]!.themeId = "C37"; }],
    ["placeholders", (k) => { k.openers[0]!.line += " Hi {First Name}."; }],
    ["correction 2", (k) => { k.openers[0]!.line += " Here is a screenshot."; }],
    ["correction 2", (k) => { k.sequence.dm1 += " https://example.com"; }],
    ["correction 3", (k) => { k.sequence.dm2 += " It already uses your photos."; }],
    ["money", (k) => { k.pricing.lineItems[0]!.min = 900; }],
    ["money", (k) => { k.pricing.lineItems[0]!.item = "Premium style page"; }],
    ["evidence", (k) => { k.openers[0]!.line += " Fence leads are up 40% this year."; }],
    ["evidence", (k) => { k.openers[0]!.line += " There are 312 fence companies here."; }],
    ["brand names", (k) => { k.openers[0]!.line += " Better than a fence profile on Thumbtack."; }],
    ["swap test", (k) => { for (const o of k.openers.slice(0, 4)) o.line = "Your business deserves a better website, and I can help with that."; }],
    ["ladder", (k) => { k.upsellLadder[2]!.day = 10; }],
    ["overlap", (k) => { k.softwareAI[0]!.name = k.whatElseYouSell[0]!.name; }],
  ])("%s", (rule, mutate) => {
    expect(rulesFor(mutate)).toContain(rule);
  });

  it("allows prices, durations, times of day and dimensions", () => {
    const rules = rulesFor((k) => {
      k.openers[0]!.line = "A six-foot cedar fence at $4k, built in 3 days, booked at 9pm, a 6-foot gate and 12 photos of fence work.";
    });
    expect(rules.has("evidence")).toBe(false);
  });
});
