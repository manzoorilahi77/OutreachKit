import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COLS } from "@/data";
import { CSV_HEADER, csvField, leadCells, type LeadRow } from "@/lib/leads/csv";
import { CHECK_LABELS } from "@/lib/leads/checks";
import { IMPORT_CAP, checkHeader, dedupeKeys, parseCsv, previewImport } from "@/lib/leads/import";

const fixture = readFileSync("tests/fixtures/leads-import-two-rows.csv", "utf8");
const header = CSV_HEADER;

describe("import header", () => {
  it("accepts the 28 columns alone, or followed by scorer columns", () => {
    expect(checkHeader(COLS).ok).toBe(true);
    expect(checkHeader([...COLS, ...CHECK_LABELS.map((c) => c.label)]).ok).toBe(true);
    expect(checkHeader([...COLS, CHECK_LABELS[3]!.label]).ok).toBe(true);
  });
  it("names the wrong column", () => {
    const bad = COLS.slice();
    bad[6] = "Telephone";
    expect(checkHeader(bad)).toEqual({ ok: false, error: 'Column 7 is "Telephone". It should be "Phone".' });
    expect(checkHeader(COLS.slice(0, 27))).toMatchObject({ ok: false, error: expect.stringContaining('Column 28 should be "Notes"') });
    expect(checkHeader([...COLS, "Hot lead?"])).toMatchObject({ ok: false, error: expect.stringContaining('Column 29 is "Hot lead?"') });
    expect(checkHeader([...COLS, CHECK_LABELS[0]!.label, CHECK_LABELS[0]!.label])).toMatchObject({ ok: false, error: expect.stringContaining("appears twice") });
  });
});

describe("import rows", () => {
  it("reads the two-row fixture, mapping Stage and Channel by label and the checks by name", () => {
    const p = previewImport(fixture, []);
    expect(p.ok).toBe(true);
    expect(p.errors).toEqual([]);
    expect(p.add).toHaveLength(2);
    const [a, b] = p.add.map((r) => r.lead);
    expect(a!.stage).toBe("qualified");
    expect(a!.channel).toBe("email");
    expect(a!.website_found).toBe(false);
    expect(a!.google_rating).toBe(4.8);
    expect(Object.values(a!.checks).filter(Boolean)).toHaveLength(9);
    expect(Object.values(b!.checks).filter(Boolean)).toHaveLength(6);
    expect(a!.notes).toContain("Opener: No Website button");
  });

  it("round-trips a row the export wrote", () => {
    const lead: LeadRow = {
      date_sourced: "2026-10-01", business_name: "Acme, \"Fence\" Co", owner_first_name: "Sam", category: "Fencing & gates", city: "Austin", state: "TX",
      phone: "+1 512 555 0100", email: "sam@acme.example", instagram_handle: "", facebook_page: "", google_maps_url: "", website_found: true,
      website_url: "=HYPERLINK()", site_verdict: "", google_review_count: 12, google_rating: 4.5, followers: null, last_post_date: null, score: 0,
      tier: "skip", demo_url: "", demo_built_date: null, first_contact_date: "2026-10-02", channel: "instagram_dm", replied: true, stage: "contacted",
      next_action_date: "2026-10-04", notes: "line one\nline two",
    };
    const csv = header + "\r\n" + leadCells(lead).map((c) => csvField(/^[=@]/.test(c) ? "'" + c : c)).join(",") + "\r\n";
    const p = previewImport(csv, []);
    expect(p.errors).toEqual([]);
    const got = p.add[0]!.lead;
    expect(got).toMatchObject({ business_name: "Acme, \"Fence\" Co", website_url: "=HYPERLINK()", channel: "instagram_dm", stage: "contacted", replied: true, notes: "line one\nline two" });
  });

  it("reports a bad row without blocking the good ones", () => {
    const rows = parseCsv(fixture);
    rows[2]![25] = "Pending";
    rows[2]![17] = "28/09/2026";
    const p = previewImport(rows.map((r) => r.map(csvField).join(",")).join("\n"), []);
    expect(p.add).toHaveLength(1);
    expect(p.errors[0]).toMatchObject({ line: 3, business: "Pflugerville Gate & Iron" });
    expect(p.errors[0]!.error).toContain('Stage "Pending"');
  });
});

describe("import dedupe", () => {
  it("matches on email, digits-only phone or Maps URL, and never overwrites", () => {
    expect(previewImport(fixture, [{ email: "OFFICE@cedarlinefence.example", phone: "", google_maps_url: "" }]).duplicates).toEqual([{ line: 2, business: "Cedar Line Fence Co", matchedOn: "email" }]);
    expect(previewImport(fixture, [{ email: "", phone: "+1 512-555-0199", google_maps_url: "" }]).duplicates[0]).toMatchObject({ line: 3, matchedOn: "phone" });
    expect(previewImport(fixture, [{ email: "", phone: "", google_maps_url: "https://maps.google.com/?cid=111/" }]).duplicates[0]).toMatchObject({ matchedOn: "Google Maps URL" });
    expect(dedupeKeys({ email: "", phone: "(512) 555-0142", google_maps_url: "" })).toEqual(["p:5125550142"]);
  });
  it("skips a repeat inside the same file", () => {
    const rows = parseCsv(fixture);
    const twice = [rows[0]!, rows[1]!, rows[1]!].map((r) => r.map(csvField).join(",")).join("\n");
    const p = previewImport(twice, []);
    expect(p.add).toHaveLength(1);
    expect(p.duplicates).toHaveLength(1);
  });
});

describe("import cap", () => {
  it(`refuses more than ${IMPORT_CAP} rows`, () => {
    const rows = parseCsv(fixture);
    const body = Array.from({ length: IMPORT_CAP + 1 }, (_, i) => rows[1]!.map((c, j) => (j === 7 ? `x${i}@example.com` : j === 6 || j === 10 ? "" : c)));
    const p = previewImport([rows[0]!, ...body].map((r) => r.map(csvField).join(",")).join("\n"), []);
    expect(p.ok).toBe(false);
    expect(p.error).toContain("at most 200");
    const ok = previewImport([rows[0]!, ...body.slice(0, IMPORT_CAP)].map((r) => r.map(csvField).join(",")).join("\n"), []);
    expect(ok.add).toHaveLength(IMPORT_CAP);
  });
});
