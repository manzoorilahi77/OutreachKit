import { describe, expect, it } from "vitest";
import { ARCH, BOARD } from "@/data";
import { CATS, findCategory } from "@/lib/kit/categories";
import { archKey, gapMid, makeMaps, makeTags, marketSize, money, priceModel, rotation, runBlocks } from "@/lib/kit/helpers";
import { sectionPlan } from "@/lib/kit/buildPrompt";
import { generateKit } from "@/lib/kit/generate";
import { messages } from "@/lib/kit/messages";
import { openers } from "@/lib/kit/openers";
import { buildContext } from "@/lib/kit/generate";

const fencing = findCategory("Fencing & gates")!;

describe("categories", () => {
  it("derives 124 categories with unique names", () => {
    expect(CATS).toHaveLength(BOARD.length);
    expect(new Set(CATS.map((c) => c.n)).size).toBe(124);
  });
  it("scores the way the original does (weights 2,2,1.5,1,1,1.5,1 over 50)", () => {
    expect(fencing.d).toEqual([4, 5, 5, 5, 5, 3, 4]);
    expect(fencing.idx).toBe(88); // section 02 names fencing & gates at 88
    expect(fencing.tier).toBe("A");
  });
});

describe("market size", () => {
  it("ranks a city by its position in the state list", () => {
    expect(marketSize("TX", "Houston")[0]).toBe("Major metro");
    expect(marketSize("TX", "Austin")).toEqual(["Mid-size market", 40]);
    expect(marketSize("TX", "Katy")).toEqual(["Smaller market", 16]);
    expect(marketSize("TX", "Siloam Springs")).toEqual(["Unlisted town — assume a smaller market", 12]);
    expect(marketSize("", "x")).toEqual(["Unknown", 25]);
  });
});

describe("pricing", () => {
  it("rounds to $50 and scales by market", () => {
    const p = priceModel(fencing, 1);
    expect(p).toMatchObject({ min: 1800, max: 3000, rec: 2400, careRec: 99 });
    expect(priceModel(fencing, 0.8).min).toBe(1450);
  });
  it("falls back to $1,200–$2,500 when the price string has no range", () => {
    expect(priceModel({ ...fencing, price: "custom" }, 1)).toMatchObject({ min: 1200, max: 2500 });
  });
  it("formats money like en-US", () => expect(money(12500)).toBe("$12,500"));
  it("reads the midpoint of a percentage range", () => {
    expect(gapMid("50–60%")).toBeCloseTo(0.55);
    expect(gapMid("n/a")).toBe(0.45);
  });
});

describe("searches and tags", () => {
  it("builds Maps strings with the state abbreviation", () => {
    expect(makeMaps(fencing, "TX", "Austin")[0]).toBe("fence company near Austin, TX");
  });
  it("caps hashtags at 14 and never repeats one", () => {
    const tags = makeTags(fencing, "TX", "Austin");
    expect(tags.length).toBeLessThanOrEqual(14);
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags.every((t) => t.startsWith("#"))).toBe(true);
  });
  it("rotates through up to ten other cities", () => {
    const r = rotation("TX", "Austin");
    expect(r).toHaveLength(10);
    expect(r).not.toContain("Austin");
  });
});

describe("generators", () => {
  const ctx = buildContext({ cat: "Fencing & gates", device: "desktop", st: "TX", city: "Austin" });
  it("writes 15 openers and 8 messages", () => {
    expect(openers(ctx)).toHaveLength(15);
    expect(messages(ctx)).toHaveLength(8);
  });
  it("uses placeholders when step 4 is blank and the real values when filled", () => {
    expect(ctx.you).toBe("{Your Name}");
    expect(ctx.demo).toBe("https://yourstudio.com/austin/{business-name}");
    const filled = buildContext({ cat: "Fencing & gates", device: "desktop", st: "TX", city: "Austin", domain: "https://x.com//", you: "Sam" });
    expect(filled.demo).toBe("https://x.com/austin/{business-name}");
    expect(filled.you).toBe("Sam");
  });
  it("splits an archetype's sections into reused and new components", () => {
    const plan = sectionPlan(ARCH[archKey(fencing)]);
    expect(plan.reuse.length + plan.build.length).toBe(ARCH[archKey(fencing)].sec.length);
  });
  it("swaps the 60-minute block by device", () => {
    expect(runBlocks(true)[1]![1]).toBe("Instagram sweep — phone");
    expect(runBlocks(false)[1]![1]).toBe("Maps sweep — desktop");
  });
  it("covers the archetypes the brief names", () => {
    expect(archKey(findCategory("Hair salons & suites")!)).toBe("book");
    expect(archKey(findCategory("Commercial janitorial")!)).toBe("rfq");
  });
  it("throws on an unknown category", () => {
    expect(() => generateKit({ cat: "Nope", device: "desktop", st: "TX", city: "Austin" })).toThrow();
  });
});
