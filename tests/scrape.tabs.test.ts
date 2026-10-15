import { describe, expect, it } from "vitest";
import { splitByWebsite } from "@/lib/scrape/tabs";
import type { BusinessRow } from "@/lib/scrape/types";

const b = (id: string, over: Partial<BusinessRow> = {}): BusinessRow => ({
  id, placeKey: "k" + id, scrapedOn: "2026-10-13", scrapedAt: "2026-10-13 10:00:00", query: "q", category: "Roofing", city: "Dallas", state: "TX",
  name: "Biz " + id, phone: "", address: "", mapsCategory: "", rating: null, reviewCount: null, email: "", facebookUrl: "", instagramUrl: "",
  otherLinks: [], mapsUrl: "https://maps.example/" + id, movedLeadId: null, hasWebsite: false, websiteUrl: "", whatsapp: "", ...over,
});

describe("splitByWebsite", () => {
  it("puts businesses with a website in one tab and the rest in the other, keeping order", () => {
    const rows = [b("1"), b("2", { hasWebsite: true, websiteUrl: "https://a.example" }), b("3"), b("4", { hasWebsite: true })];
    const got = splitByWebsite(rows);
    expect(got.without.map((r) => r.id)).toEqual(["1", "3"]);
    expect(got.with.map((r) => r.id)).toEqual(["2", "4"]);
  });
  it("treats rows saved before the website fields existed as having no website", () => {
    const legacy = { ...b("9") } as Partial<BusinessRow>;
    delete legacy.hasWebsite;
    expect(splitByWebsite([legacy as BusinessRow]).without).toHaveLength(1);
  });
  it("returns two empty lists for no rows", () => {
    expect(splitByWebsite([])).toEqual({ without: [], with: [] });
  });
});
