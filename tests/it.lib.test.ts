// IT Prospects: the pure parts (keys, forms, the paste parser, the CSV import, search strings, scoring, nav and routes).
import { describe, expect, it } from "vitest";
import { IT_NAV_ITEM, navFor, withItNav } from "@/lib/auth/nav";
import { ROLES } from "@/lib/auth/roles";
import { ruleFor } from "@/lib/auth/routes";
import { IT_CATEGORIES, IT_FACTORS, findItCategory, itCategoriesFor, itCategoryTotal } from "@/lib/it/categories";
import { prospectsToCsv } from "@/lib/it/csv";
import { cleanUrl, parseProspect, parseSignalInput } from "@/lib/it/form";
import { finderToInput } from "@/lib/it/fromFinder";
import { parseItCsv } from "@/lib/it/importCsv";
import { companyDomain, domainOf, isBoardHost, prospectKeys } from "@/lib/it/keys";
import { EMPTY_QUALIFIER, SIGNAL_TYPES, daysSince, isFresh, qualScore, toProspectView, type ItProspect } from "@/lib/it/model";
import { guessCompany, guessDate, guessPlace, guessType, parseSignal, sourceOf } from "@/lib/it/parseSignal";
import { searchStrings } from "@/lib/it/searchStrings";
import { COUNTRY_CODES } from "@/lib/market/regions";

const TODAY = "2026-10-15";

describe("keys", () => {
  it("reads a domain from a URL, an email or a typed domain", () => {
    expect(domainOf("https://www.Acme.io/jobs?x=1")).toBe("acme.io");
    expect(domainOf("jo@acme.io")).toBe("acme.io");
    expect(domainOf("acme.co.uk")).toBe("acme.co.uk");
    expect(domainOf("not a domain")).toBe("");
    expect(domainOf("javascript:alert(1)")).toBe("");
  });
  it("never takes a job board or a free mailbox as the company's domain", () => {
    expect(companyDomain("https://www.linkedin.com/jobs/view/1", "jo@gmail.com", "https://acme.io")).toBe("acme.io");
    expect(companyDomain("https://boards.greenhouse.io/acme/jobs/1")).toBe("");
    expect(isBoardHost("https://ca.indeed.com/viewjob")).toBe(true);
  });
  it("gives every key a prospect answers to, most specific first", () => {
    expect(prospectKeys({ companyDomain: "Acme.io", email: "Jo@Acme.io", phone: "+1 (512) 555-0100", mapsUrl: "https://www.google.com/maps/place/x/data=!1s0x1:0x2", company: "Acme, LLC", city: "Austin" }))
      .toEqual(["d:acme.io", "e:jo@acme.io", "p:5125550100", "m:fid:0x1:0x2", "n:acme|austin"]);
    expect(prospectKeys({ companyDomain: "", email: "", phone: "", mapsUrl: "", company: "Acme", city: "" })).toEqual([]);
  });
});

describe("the prospect form", () => {
  const base: Record<string, string> = { company: "Acme", segment: "buyer", websiteUrl: "acme.io", email: "Jo@Acme.io", region: "tx", country: "", teamSize: "" };
  const get = (over: Record<string, string> = {}) => (k: string) => ({ ...base, ...over })[k] ?? "";
  it("cleans and fills what it can", () => {
    const r = parseProspect(get());
    expect(r.ok && r.value).toMatchObject({ websiteUrl: "https://acme.io/", companyDomain: "acme.io", email: "jo@acme.io", region: "TX", country: "US" });
  });
  it("refuses what doesn't fit", () => {
    expect(parseProspect(get({ company: " " }))).toMatchObject({ ok: false });
    expect(parseProspect(get({ segment: "x" }))).toMatchObject({ ok: false });
    expect(parseProspect(get({ websiteUrl: "javascript:alert(1)" }))).toMatchObject({ ok: false });
    expect(parseProspect(get({ region: "ZZ" }))).toMatchObject({ ok: false });
    expect(parseProspect(get({ region: "ON", country: "US" }))).toMatchObject({ ok: false });
    expect(parseProspect(get({ email: "nope" }))).toMatchObject({ ok: false });
    expect(parseProspect(get({ company: "x".repeat(300) }))).toMatchObject({ ok: false });
  });
  it("takes the country from an emirate or a province", () => {
    const r = parseProspect(get({ region: "DXB" }));
    expect(r.ok && r.value.country).toBe("AE");
  });
  it("checks a signal", () => {
    const sig = (o: Record<string, string>) => parseSignalInput((k) => o[k] ?? "");
    expect(sig({ signalType: "tender", signalUrl: "sam.gov/opp/1", signalDate: "2026-10-01" })).toMatchObject({ ok: true, value: { url: "https://sam.gov/opp/1", signalDate: "2026-10-01" } });
    expect(sig({ signalType: "tender" })).toMatchObject({ ok: false });
    expect(sig({ signalType: "nope", signalQuote: "x" })).toMatchObject({ ok: false });
    expect(sig({ signalType: "tender", signalQuote: "x", signalDate: "2026-13-40" })).toMatchObject({ ok: false });
    expect(cleanUrl("data:text/html,x")).toBeNull();
  });
});

describe("the paste parser", () => {
  it("reads a LinkedIn job post", () => {
    const text = `Senior React Developer
Acme Logistics · Austin, TX (Remote)
3 weeks ago · 54 applicants
We're hiring a React developer to build our dispatch portal. Apply at https://acme-logistics.com/careers or email jobs@acme-logistics.com.`;
    const p = parseSignal(text, "https://www.linkedin.com/jobs/view/123", TODAY);
    expect(p).toMatchObject({
      company: "Acme Logistics", headline: "Senior React Developer", type: "dev_role", signalDate: "2026-09-24", city: "Austin", region: "TX", country: "US",
      remote: true, companyDomain: "acme-logistics.com", email: "jobs@acme-logistics.com", source: "LinkedIn",
    });
    expect(p.quote.length).toBeLessThanOrEqual(280);
  });
  it("reads a project post and a tender", () => {
    expect(guessType("Looking for an agency to rebuild our booking portal. Share your portfolio and commercials.")).toBe("looking_for");
    expect(guessType("We need a fixed-price quote for a portal; send your proposal")).toBe("project_post");
    expect(guessType("Request for Proposals: permit tracking web application. Closing date Nov 3, 2026")).toBe("tender");
    expect(guessType("Our MVP was vibe coded and logins break")).toBe("ai_rescue");
    expect(guessType("Data entry clerk for our order tracker")).toBe("it_role");
    expect(guessType("Nothing obvious here", "https://www.indeed.com/viewjob?jk=1")).toBe("dev_role");
  });
  it("finds the company", () => {
    expect(guessCompany("Company: Northwind Traders\nRole: PHP developer")).toBe("Northwind Traders");
    expect(guessCompany("Contoso Health is hiring a full stack engineer")).toBe("Contoso Health");
    expect(guessCompany("Full Stack Engineer at Fabrikam Inc, Toronto")).toBe("Fabrikam Inc");
    expect(guessCompany("We are hiring a developer")).toBe("");
  });
  it("dates the post", () => {
    expect(guessDate("Posted 5 days ago", TODAY)).toBe("2026-10-10");
    expect(guessDate("Published: Oct 3, 2026. Closing date: Nov 3, 2026", TODAY)).toBe("2026-10-03");
    expect(guessDate("Issued 2026-09-30, closes 2026-10-30", TODAY)).toBe("2026-09-30");
    expect(guessDate("3 Oct 2026", TODAY)).toBe("2026-10-03");
    expect(guessDate("10/03/2026", TODAY)).toBe("2026-10-03");
    expect(guessDate("no date", TODAY)).toBeNull();
  });
  it("places the post", () => {
    expect(guessPlace("Office in Business Bay, Dubai")).toMatchObject({ region: "DXB", country: "AE" });
    expect(guessPlace("Toronto, ON")).toMatchObject({ city: "Toronto", region: "ON", country: "CA" });
    expect(guessPlace("Hybrid, Ontario")).toMatchObject({ region: "ON", country: "CA" });
    expect(guessPlace("anywhere")).toMatchObject({ country: null });
  });
  it("names the source", () => {
    expect(sourceOf("https://www.upwork.com/jobs/~1")).toBe("Upwork");
    expect(sourceOf("https://news.ycombinator.com/item?id=1")).toBe("Hacker News");
    expect(sourceOf("https://acme.io/careers")).toBe("acme.io");
    expect(sourceOf("")).toBe("");
  });
});

describe("the CSV import", () => {
  it("matches loose headers and reads each row", () => {
    const csv = `Company name,Website,First name,Last name,Job title,Job URL,Date posted,State,Notes
Acme,acme.io,Dana,Diaz,React Developer,https://www.linkedin.com/jobs/view/1,2026-10-01,TX,met at a meetup
Beta Agency,https://beta.agency,,,,,,ON,
,x.io,,,,,,,
Gamma,gamma.io,,,,,13/45/2026,,`;
    const r = parseItCsv(csv, TODAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows[0]).toMatchObject({ line: 2, input: { company: "Acme", contactName: "Dana Diaz", companyDomain: "acme.io", region: "TX", country: "US", segment: "buyer" }, signal: { type: "dev_role", signalDate: "2026-10-01", source: "LinkedIn" } });
    expect(r.rows[1]).toMatchObject({ input: { segment: "agency", country: "CA" }, signal: null });
    expect(r.rows[2]).toMatchObject({ error: "Enter the company's name." });
    expect(r.rows[3]?.error).toMatch(/isn't a date/);
  });
  it("refuses a file without a company column, an empty file and an oversized one", () => {
    expect(parseItCsv("Name,Email\nx,y", TODAY)).toMatchObject({ ok: false });
    expect(parseItCsv("", TODAY)).toMatchObject({ ok: false });
    expect(parseItCsv("Company\n" + "x\n".repeat(201), TODAY)).toMatchObject({ ok: false });
  });
});

describe("search strings", () => {
  it("gives every signal type and country something to open, and only http links", () => {
    for (const s of SIGNAL_TYPES) for (const c of COUNTRY_CODES) {
      const list = searchStrings(s.value, c);
      expect(list.length).toBeGreaterThan(0);
      for (const x of list) expect(x.url).toMatch(/^https:\/\//);
    }
    expect(searchStrings("dev_role", "CA").some((x) => x.url.startsWith("https://ca.indeed.com"))).toBe(true);
  });
});

describe("scoring and freshness", () => {
  it("scores out of six with the trigger from a fresh signal", () => {
    expect(qualScore(EMPTY_QUALIFIER, false)).toEqual({ score: 0, tier: "skip" });
    expect(qualScore({ ...EMPTY_QUALIFIER, budget: true, reachable: true }, true)).toEqual({ score: 3, tier: "warm" });
    expect(qualScore({ budget: true, buys_often: true, reachable: true, offshore_ok: true, proof_fit: true, trigger: true }, false)).toEqual({ score: 6, tier: "hot" });
  });
  it("ages signals by their type", () => {
    expect(daysSince("2026-10-01", TODAY)).toBe(14);
    expect(isFresh("project_post", "2026-10-01", TODAY)).toBe(true);
    expect(isFresh("project_post", "2026-09-30", TODAY)).toBe(false);
    expect(isFresh("dev_role", "2026-08-20", TODAY)).toBe(true);
    expect(isFresh("dev_role", null, TODAY)).toBe(false);
  });
  it("sorts signals newest first", () => {
    const p = { qualifier: EMPTY_QUALIFIER } as ItProspect;
    const v = toProspectView(p, [
      { id: "a", prospectId: "p", type: "dev_role", url: "", quote: "", signalDate: "2026-01-01", source: "", addedBy: "x", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "b", prospectId: "p", type: "dev_role", url: "", quote: "", signalDate: "2026-10-10", source: "", addedBy: "x", createdAt: "2026-01-01T00:00:00.000Z" },
    ], TODAY);
    expect(v.latest?.id).toBe("b");
    expect(v.signalState).toBe("fresh");
  });
});

describe("categories", () => {
  it("scores each row on the Reset's six factors, 1 to 5", () => {
    expect(IT_FACTORS).toHaveLength(6);
    for (const c of IT_CATEGORIES) {
      expect(c.scores).toHaveLength(6);
      for (const s of c.scores) expect(s >= 1 && s <= 5).toBe(true);
      expect(c.mapsLabels.length).toBeGreaterThan(0);
    }
    expect(new Set(IT_CATEGORIES.map((c) => c.n)).size).toBe(IT_CATEGORIES.length);
    expect(itCategoryTotal(findItCategory("Digital marketing agencies")!)).toBe(25);
    const us = itCategoriesFor("US");
    expect(itCategoryTotal(us[0]!)).toBeGreaterThanOrEqual(itCategoryTotal(us.at(-1)!));
  });
  it("turns a finder result into an agency prospect", () => {
    const i = finderToInput({
      id: "1", placeKey: "fid:0x1:0x2", scrapedOn: TODAY, scrapedAt: "", query: "", category: "Web design agencies", city: "Dubai Marina", state: "DXB", name: "Pixel",
      phone: "+971 4 123 4567", address: "Tower 1", mapsCategory: "Website designer", rating: 4.9, reviewCount: 20, email: "hi@gmail.com", facebookUrl: "", instagramUrl: "",
      otherLinks: [], mapsUrl: "https://www.google.com/maps/place/x", hasWebsite: true, websiteUrl: "https://pixel.ae/", whatsapp: "", movedLeadId: null,
    });
    expect(i).toMatchObject({ segment: "agency", companyDomain: "pixel.ae", country: "AE", region: "DXB", notes: "Address: Tower 1" });
  });
});

describe("export", () => {
  it("writes a safe CSV with the newest signal", () => {
    const p = toProspectView({
      id: "1", owner: "ravi", assignee: null, segment: "buyer", company: "=HYPERLINK(\"x\")", companyDomain: "a.io", websiteUrl: "", linkedinUrl: "", contactName: "", contactTitle: "",
      email: "", phone: "+1 512 555 0100", whatsapp: "", city: "Austin", region: "TX", country: "US", teamSize: "", mapsUrl: "", mapsCategory: "", rating: null, reviewCount: null,
      stage: "new", qualifier: EMPTY_QUALIFIER, notes: "a, b", source: "manual", createdAt: "2026-10-15T00:00:00.000Z", updatedAt: "2026-10-15T00:00:00.000Z",
    }, [], TODAY);
    const csv = prospectsToCsv([p], (u) => u.toUpperCase());
    const row = csv.split("\r\n")[1]!;
    expect(row.startsWith(`"'=HYPERLINK(""x"")"`)).toBe(true);
    expect(row).toContain("+1 512 555 0100");
    expect(row).toContain(`"a, b"`);
    expect(row).toContain("RAVI");
  });
});

describe("navigation and routes", () => {
  it("adds IT Prospects right after Kits (or before Playbook if there's no Kits link) only while the switch is on, and never for a viewer", () => {
    for (const r of ROLES) {
      expect(withItNav(navFor(r), r, false)).toEqual(navFor(r));
      const on = withItNav(navFor(r), r, true);
      if (r === "viewer") expect(on).toEqual(navFor(r));
      else {
        expect(on).toContain(IT_NAV_ITEM);
        const i = on.indexOf(IT_NAV_ITEM);
        const kits = on.findIndex((x) => x.href === "/kits");
        if (kits >= 0) expect(i).toBe(kits + 1);
        else {
          const pb = on.findIndex((x) => x.href === "/playbook");
          if (pb >= 0) expect(i).toBe(pb - 1);
        }
      }
    }
  });
  it("guards every IT path", () => {
    expect(ruleFor("/it")).toBe("it.view");
    expect(ruleFor("/it/prospects/abc")).toBe("it.view");
    expect(ruleFor("/it/prospects/new")).toBe("it.add");
    expect(ruleFor("/it/signals")).toBe("it.add");
    expect(ruleFor("/it/finder")).toBe("it.finder");
    expect(ruleFor("/it/export.csv")).toBe("it.export");
    expect(ruleFor("/api/it/finder/run")).toBe("it.finder");
    expect(ruleFor("/items")).toBe("session");
  });
});
