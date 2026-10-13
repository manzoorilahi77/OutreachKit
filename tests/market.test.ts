import { describe, expect, it } from "vitest";
import { ALL_CATS, CATS, EXT_CATS, findCategory } from "@/lib/kit/categories";
import { EXT_BOARD } from "@/lib/kit/extBoard";
import { buildContext, generateKit } from "@/lib/kit/generate";
import { kitText } from "@/lib/kit/text";
import { fromQuery, stateOptions, toKitInput, toQuery, EMPTY_CONSOLE } from "@/lib/console";
import { kitSlug } from "@/lib/kit-v2/types";
import { applyMarket, withLanguage } from "@/lib/market/apply";
import { convertMoneyText, DEFAULT_RATES, cleanRates, friendly } from "@/lib/market/currency";
import { COUNTRIES, countryOf, isRegion, placeLabel, REGIONS, regionOptions } from "@/lib/market/regions";
import { phoneDigits } from "@/lib/store/dupes";
import { searchQuery } from "@/lib/scrape/scraper";
import { validateKit } from "@/lib/kit/validate";

describe("catalogue", () => {
  it("keeps the port's 124 rows first and untouched in order", () => {
    expect(CATS).toHaveLength(124);
    expect(ALL_CATS.slice(0, 124).map((c) => c.n)).toEqual(CATS.map((c) => c.n));
    expect(CATS.every((c) => c.size === "small" && !c.ext && c.arch === undefined && c.care === undefined)).toBe(true);
  });
  it("adds about forty healthcare and mid-size categories with unique names and slugs", () => {
    expect(EXT_CATS.length).toBeGreaterThanOrEqual(38);
    expect(EXT_CATS.filter((c) => c.group === "health").length).toBeGreaterThanOrEqual(15);
    expect(EXT_CATS.filter((c) => c.size === "mid").length).toBeGreaterThanOrEqual(25);
    const names = ALL_CATS.map((c) => c.n);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(names.map(kitSlug)).size).toBe(names.length);
  });
  it("scores every new row with seven factors", () => {
    for (const r of EXT_BOARD) expect(r.digits, r.n).toMatch(/^[1-5]{7}$/);
    for (const c of EXT_CATS) expect(c.price, c.n).toMatch(/^\$[\d,]+–[\d,]+$/);
  });
  it("points every mid-size version at a small category that exists", () => {
    for (const c of EXT_CATS) if (c.smallOf) expect(findCategory(c.smallOf), c.n).toBeTruthy();
  });
});

describe("regions", () => {
  it("never collide across countries", () => {
    expect(Object.keys(REGIONS)).toHaveLength(51 + 13 + 7);
    expect(countryOf("TX")).toBe("US");
    expect(countryOf("ON")).toBe("CA");
    expect(countryOf("DXB")).toBe("AE");
    expect(isRegion("ZZ")).toBe(false);
  });
  it("lists each country's regions", () => {
    expect(stateOptions()).toHaveLength(51);
    expect(regionOptions("CA")).toHaveLength(13);
    expect(regionOptions("AE")[0]).toEqual({ code: "AUH", label: "Abu Dhabi (AUH)" });
  });
  it("labels a UAE place by its emirate", () => {
    expect(placeLabel("DXB", "Business Bay")).toBe("Business Bay, Dubai");
    expect(placeLabel("DXB", "Dubai")).toBe("Dubai");
    expect(placeLabel("ON", "Toronto")).toBe("Toronto, ON");
  });
});

describe("currency", () => {
  it("rounds to figures you can say", () => {
    expect(friendly(83.2)).toBe(85);
    expect(friendly(135.63)).toBe(140);
    expect(friendly(2466)).toBe(2450);
    expect(friendly(6606)).toBe(6600);
  });
  it("converts every price form the kits use", () => {
    const r = DEFAULT_RATES;
    expect(convertMoneyText("$1,800–3,000", "CAD", r)).toBe("C$2,450–4,100");
    expect(convertMoneyText("Jobs run $4k–12k and $300–3k.", "CAD", r)).toBe("Jobs run C$5.5k–16k and C$410–4k.");
    expect(convertMoneyText("$99 / mo", "AED", r)).toBe("AED 360 / mo");
    expect(convertMoneyText("$0", "AED", r)).toBe("AED 0");
    expect(convertMoneyText("$1,800–3,000", "USD", r)).toBe("$1,800–3,000");
  });
  it("ignores junk rates", () => {
    expect(cleanRates({ CAD: -1, AED: "x" })).toEqual(DEFAULT_RATES);
    expect(cleanRates({ CAD: 1.4, AED: 3.6 })).toEqual({ CAD: 1.4, AED: 3.6 });
  });
});

describe("applyMarket", () => {
  const build = (input: Parameters<typeof generateKit>[0], lang?: "en" | "ar" | "bi") => {
    const X = buildContext(input);
    return { X, base: generateKit(input), out: applyMarket(generateKit(input), X, { lang }) };
  };
  it("leaves a US port kit's sections exactly as they were", () => {
    const { base, out } = build({ cat: "Fencing & gates", device: "desktop", st: "TX", city: "Austin" });
    expect(kitText(out).sections).toEqual(kitText(base).sections);
    expect(out.header.chips.map((c) => c.text)).toContain("Small business");
  });
  it("lists a regrouped port category under Healthcare", () => {
    const { out } = build({ cat: "Chiropractic clinics", device: "desktop", st: "TX", city: "Austin" });
    expect(out.header.chips.map((c) => c.text)).toContain("Healthcare");
  });
  it("converts a Canadian kit to dollars CAD and adds the Canada notes", () => {
    const { out } = build({ cat: "Dental practices", device: "mobile", st: "ON", city: "Toronto" });
    const text = JSON.stringify(out);
    expect(text).not.toMatch(/(?<![C\w])\$\d/);
    expect(text).toContain("C$");
    expect(text).toContain("Working in Canada");
    expect(text).toContain("PHIPA");
  });
  it("builds a mid-size kit with its own care plan", () => {
    const { X } = build({ cat: "HVAC companies (multi-truck)", device: "desktop", st: "TX", city: "Austin" });
    expect(X.price.careRec).toBe(499);
    expect(X.arch.l).toBe("Call-now dispatch");
  });
  it("puts the UAE language block in the build prompt", () => {
    const { out } = build({ cat: "Polyclinics & multi-specialty centres", device: "desktop", st: "DXB", city: "Business Bay", lang: "ar" }, "ar");
    expect(out.header.title).toBe("Polyclinics & multi-specialty centres — Business Bay, Dubai");
    const prompt = out.sections.find((s) => s.id === "prompt")!.nodes.find((n) => n.k === "copyBlock");
    expect(prompt && prompt.k === "copyBlock" && prompt.text).toContain('dir="rtl"');
    expect(JSON.stringify(out)).toContain("AED ");
    expect(JSON.stringify(out)).toContain("DHA");
  });
  it("places the language block before Technical requirements", () => {
    const t = withLanguage("Style\nx\n\nTechnical requirements\n- y", "bi");
    expect(t.indexOf("Language and direction")).toBeLessThan(t.indexOf("Technical requirements"));
  });
});

describe("console, finder and leads across countries", () => {
  it("round-trips a UAE kit through the URL", () => {
    const s = { ...EMPTY_CONSOLE, country: "AE" as const, size: "mid" as const, cat: "Polyclinics & multi-specialty centres", st: "DXB" as const, listCity: "Business Bay", lang: "bi" as const };
    expect(fromQuery(toQuery(s))).toEqual(s);
    expect(toKitInput(s)?.lang).toBe("bi");
    expect(toKitInput({ ...s, country: "US", st: "TX", listCity: "Austin" })?.lang).toBeUndefined();
  });
  it("remembers a country with no region yet", () => expect(fromQuery("country=CA").country).toBe("CA"));
  it("saves a UAE kit with its site language", () => {
    const v = validateKit({ category: "Dental practices", device: "desktop", state: "DXB", city: "Jumeirah", siteLang: "ar" });
    expect(v.ok && v.value.siteLang).toBe("ar");
    expect(validateKit({ category: "Dental practices", device: "desktop", state: "TX", city: "Austin", siteLang: "ar" }).ok && true).toBe(true);
  });
  it("names the country in a Maps search outside the US", () => {
    expect(searchQuery("Fencing & gates", "Austin", "TX")).toBe("Fencing & gates in Austin, TX");
    expect(searchQuery("Dental practices", "Business Bay", "DXB")).toBe("Dental practices in Business Bay, Dubai, UAE");
    expect(searchQuery("Dental practices", "Toronto", "ON")).toBe("Dental practices in Toronto, ON, Canada");
  });
  it("matches UAE phone numbers written locally and internationally", () => {
    expect(phoneDigits("+971 50 123 4567")).toBe(phoneDigits("050 123 4567"));
    expect(phoneDigits("+971 4 123 4567")).toBe(phoneDigits("04-123-4567"));
    expect(phoneDigits("00971 4 123 4567")).toBe("41234567");
    expect(phoneDigits("(971) 555-1234")).toBe("9715551234"); // an Oregon number stays whole
    expect(phoneDigits("+1 512 555 0100")).toBe("5125550100");
  });
  it("knows every country's name", () => expect(Object.keys(COUNTRIES)).toEqual(["US", "CA", "AE"]));
});
