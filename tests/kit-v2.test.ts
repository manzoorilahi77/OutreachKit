import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIXTURES } from "../golden/fixtures";
import { STYLE } from "@/data";
import { buildPromptText } from "@/lib/kit/buildPrompt";
import { buildContext, generateKit } from "@/lib/kit/generate";
import { priceMult } from "@/lib/kit/helpers";
import { kitText } from "@/lib/kit/text";
import type { KitInput } from "@/lib/kit/types";
import { applyCategoryKit, fillCopy, scaledRange } from "@/lib/kit-v2/apply";
import { loadCategoryKit } from "@/lib/kit-v2/load";
import { buildPromptTextV2 } from "@/lib/kit-v2/prompt";
import { kitSlug } from "@/lib/kit-v2/types";
import type { CategoryKit, DirectionId } from "@/lib/kit-v2/types";

const ck = (cat: string) => JSON.parse(readFileSync(`src/kits/${kitSlug(cat)}.json`, "utf8")) as CategoryKit;
const v2 = (input: KitInput, dir: DirectionId = "b") => applyCategoryKit(generateKit(input), buildContext(input), ck(input.cat), dir);
const details = { you: "Maria", brand: "Lone Star Web", domain: "https://lonestarweb.com/" };

// golden/v2 holds this layer's own goldens, separate from the original's golden/original.
describe.each(Object.entries(FIXTURES))("category kit overlay: %s", (name, input) => {
  it("matches golden/v2", async () => {
    await expect(JSON.stringify(kitText(v2(input)), null, 2) + "\n").toMatchFileSnapshot(`../golden/v2/${name}.json`);
  });
});

describe("applyCategoryKit", () => {
  it("returns the ported kit deep-equal when there is no category kit", () => {
    for (const input of Object.values(FIXTURES)) {
      const kit = generateKit(input);
      expect(applyCategoryKit(kit, buildContext(input), null)).toEqual(generateKit(input));
    }
  });

  it("inserts the directions section before the prompt and adds the content chip", () => {
    const k = v2(FIXTURES["fencing-austin-desktop"]!);
    const ids = k.sections.map((s) => s.id);
    expect(ids.indexOf("directions")).toBe(ids.indexOf("prompt") - 1);
    expect(ids).toHaveLength(18);
    expect(k.header.chips.at(-1)!.text).toBe("Category kit · Unreviewed");
  });

  it("fills the engine's placeholders and leaves the rep's", () => {
    const input = { ...FIXTURES["fencing-austin-desktop"]!, ...details };
    const all = JSON.stringify(kitText(v2(input)));
    for (const gone of ["{demo-link}", "{City}", "{Your Name}", "{Your Studio}", "{Build Range}", "{Build Price}", "{Care Range}"]) expect(all).not.toContain(gone);
    for (const kept of ["{Owner}", "{Business Name}", "{specific recent job}", "{Your Phone}"]) expect(all).toContain(kept);
  });

  it("keeps Correction 2: no opener line and no DM 1 carries a link", () => {
    for (const input of Object.values(FIXTURES)) {
      const k = v2(input);
      const openers = k.sections.find((s) => s.id === "openers")!.nodes.find((n) => n.k === "openers")!;
      if (openers.k !== "openers") throw new Error();
      for (const o of openers.items) expect(o[1]).not.toMatch(/http/);
      const dm1 = k.sections.find((s) => s.id === "sequence")!.nodes.find((n) => n.k === "copyBlock")!;
      if (dm1.k !== "copyBlock") throw new Error();
      expect(dm1.label).toMatch(/^DM 1/);
      expect(dm1.text).not.toMatch(/http/);
    }
  });
});

describe("market scaling", () => {
  it("uses the same multiplier as priceModel", () => {
    expect([priceMult(90), priceMult(40), priceMult(16), priceMult(12)]).toEqual([1.15, 1, 0.85, 0.8]);
  });
  it("leaves a $1,000 row at 1,000 in Austin and takes it to 800 in a small town", () => {
    expect(scaledRange(1000, 1000, "one-time", true, priceMult(40))).toEqual([1000, 1000]);
    expect(scaledRange(1000, 1000, "one-time", true, priceMult(12))).toEqual([800, 800]);
  });
  it("never scales a $299/mo AI row", () => {
    for (const m of [12, 16, 40, 90]) expect(scaledRange(299, 299, "monthly", false, priceMult(m))).toEqual([299, 299]);
  });
  it("fills {Build Range} with the market-scaled Standard tier", () => {
    const X = buildContext(FIXTURES["rfq-siloam-springs-desktop"]!);
    expect(fillCopy("{Build Range}", X)).toBe(`$${X.price.min.toLocaleString("en-US")}–$${X.price.max.toLocaleString("en-US")}`);
  });
});

describe("buildPromptTextV2", () => {
  const input = FIXTURES["fencing-austin-desktop"]!;
  const X = buildContext(input);
  const fencing = ck(input.cat);

  it("is the v1 text byte for byte when direction b is the family combo and there are no extra sections", () => {
    const bare: CategoryKit = { ...fencing, pageStructurePlus: [] };
    expect(bare.designDirections.find((d) => d.id === "b")!.themeId).toBe(STYLE.out[0]);
    expect(buildPromptTextV2(X, bare, "b")).toBe(buildPromptText(X));
  });

  it("changing the direction changes only the themeId lines and the Style chunk", () => {
    const a = buildPromptTextV2(X, fencing, "a").split("\n");
    const c = buildPromptTextV2(X, fencing, "c").split("\n");
    expect(a.length).toBe(c.length);
    const styleStart = a.indexOf("Style");
    const styleEnd = a.indexOf("Technical requirements");
    a.forEach((line, i) => {
      if (line === c[i]) return;
      const inStyle = i > styleStart && i < styleEnd;
      expect(inStyle || /themeId:? '/.test(line), `line ${i} changed outside Style: ${line}`).toBe(true);
    });
  });

  it("adds the category's sections after the family's list", () => {
    const t = buildPromptTextV2(X, fencing, "b");
    expect(t).toContain("Specific to Fencing & gates — add these sections\n- Gates and openers: ");
    expect(t.indexOf("Specific to Fencing & gates")).toBeGreaterThan(t.indexOf("Specific to this trade"));
  });

  it("keeps the Correction 3 photo constraint word for word", () => {
    const rule = "2. Never use the prospect's own photos without their written permission. Until I tell you I hold it, every photo slot uses public/placeholder.svg, clearly marked as a placeholder on the page. Once I do, use only the images I supply. No stock photography, no AI-generated photos of work.";
    expect(buildPromptText(X)).toContain(rule);
    for (const d of ["a", "b", "c"] as const) expect(buildPromptTextV2(X, fencing, d)).toContain(rule);
  });

  it("names the hero layout and the site type", () => {
    const t = buildPromptTextV2(X, fencing, "c");
    expect(t).toContain("Hero: adapt the template's Hero to a full bleed photo composition; do not add a second hero component.");
    expect(t).toContain("themeId 'C4' — Navy & Brass, dark.");
  });
});

describe("loadCategoryKit", () => {
  it("loads a pilot and returns null for a category with no file", async () => {
    expect((await loadCategoryKit("Fencing & gates"))?.slug).toBe("fencing-gates");
    expect(await loadCategoryKit("Not a category")).toBeNull();
  });
});
