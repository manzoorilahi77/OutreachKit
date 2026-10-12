import { describe, expect, it } from "vitest";
import { parseLeadForm } from "@/lib/leads/form";
import { businessToLeadFields, businessToLeadForm } from "@/lib/scrape/leadMap";
import { instagramHandle } from "@/lib/scrape/links";
import type { BusinessRow } from "@/lib/scrape/types";

const row: BusinessRow = {
  id: "7", placeKey: "fid:0x1:0x2", scrapedOn: "2026-10-09", scrapedAt: "2026-10-09 10:00:00", query: "Roofers in Dallas, TX",
  category: "Roofers", city: "Dallas", state: "TX", name: "Lone Star Roof Pros", phone: "+1 214-555-0147",
  address: "1200 Example Ave Ste 4, Dallas, TX 75201, United States", mapsCategory: "Roofing contractor", rating: 4.8, reviewCount: 212,
  email: "hello@lonestarroofpros.example", facebookUrl: "https://www.facebook.com/lonestarroofpros",
  instagramUrl: "https://www.instagram.com/lonestar_roofpros/?hl=en", otherLinks: [{ label: "Yelp", url: "https://www.yelp.com/biz/lone-star" }],
  mapsUrl: "https://www.google.com/maps/place/Lone+Star+Roof+Pros/data=!4m7!3m6!1s0x1:0x2", movedLeadId: null,
};

describe("Move to Leads: saved business -> lead", () => {
  it("passes the same validator as the lead form and keeps every mapped column", () => {
    const parsed = parseLeadForm(businessToLeadForm(row, "2026-10-09"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toMatchObject({
      date_sourced: "2026-10-09",
      business_name: "Lone Star Roof Pros",
      category: "Roofers",
      city: "Dallas",
      state: "TX",
      phone: "+1 214-555-0147",
      email: "hello@lonestarroofpros.example",
      instagram_handle: "@lonestar_roofpros",
      facebook_page: "https://www.facebook.com/lonestarroofpros",
      google_maps_url: row.mapsUrl,
      google_rating: 4.8,
      google_review_count: 212,
      website_found: false,
      website_url: "",
    });
    expect(parsed.value.checks.check_no_real_website).toBe(true);
    expect(Object.entries(parsed.value.checks).filter(([, v]) => v).map(([k]) => k)).toEqual(["check_no_real_website"]);
  });

  it("leaves empty what the listing did not show", () => {
    const sparse: BusinessRow = { ...row, phone: "", email: "", facebookUrl: "", instagramUrl: "", rating: null, reviewCount: null, otherLinks: [] };
    const parsed = parseLeadForm(businessToLeadForm(sparse, "2026-10-09"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toMatchObject({ phone: "", email: "", instagram_handle: "", facebook_page: "", google_rating: null, google_review_count: null, website_found: false });
  });

  it("puts the address, Maps category and extra links in the notes", () => {
    const notes = businessToLeadFields(row, "2026-10-09").notes!;
    expect(notes).toContain("Address: 1200 Example Ave Ste 4");
    expect(notes).toContain("Maps category: Roofing contractor");
    expect(notes).toContain("Yelp: https://www.yelp.com/biz/lone-star");
    expect(notes).toContain("2026-10-09");
  });

  it("is rejected by the lead validator when the data is bad, like any hand-typed lead", () => {
    expect(parseLeadForm(businessToLeadForm({ ...row, name: "  " }, "2026-10-09"))).toEqual({ ok: false, error: "Add the business name." });
    expect(parseLeadForm(businessToLeadForm({ ...row, state: "ZZ" }, "2026-10-09")).ok).toBe(false);
    expect(parseLeadForm(businessToLeadForm({ ...row, rating: 9 }, "2026-10-09")).ok).toBe(false);
  });

  it("turns an Instagram profile link into a handle, and refuses post links", () => {
    expect(instagramHandle("https://instagram.com/some.shop")).toBe("@some.shop");
    expect(instagramHandle("https://www.instagram.com/p/Cabc123/")).toBe("");
    expect(instagramHandle("https://example.com/some.shop")).toBe("");
  });
});
