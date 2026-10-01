import { describe, expect, it } from "vitest";
import { COLS } from "@/data";
import { SECTIONS } from "@/content/sections";
import { CHECK_FIELDS } from "@/lib/leads/checks";
import { CSV_HEADER, leadCells, leadsToCsv, safeCell, type LeadRow } from "@/lib/leads/csv";
import { parseLeadForm } from "@/lib/leads/form";
import { MIN_LEADS, formatRatio, liveRatios, reached } from "@/lib/leads/ratios";
import { SEQUENCE, addDays, nextActionDate, stageChangePatch, touchPatch, type LeadState } from "@/lib/leads/sequence";
import { STAGES } from "@/lib/leads/stages";
import type { Inline } from "@/content/types";

const section = (id: string) => SECTIONS.find((s) => s.id === id)!;
const strongText = (inline: Inline[]) => inline.flatMap((x) => (typeof x === "object" && "strong" in x ? x.strong : [])).join("");

describe("stages and sequence match the playbook", () => {
  it("has the eight pipeline stages of section 09", () => {
    const card = section("track").blocks.find((b) => b.type === "cards");
    const steps = card && card.type === "cards" ? card.cards[0]!.find((b) => b.type === "steps") : undefined;
    const labels = steps && steps.type === "steps" ? steps.items.map((i) => strongText(i.inline)) : [];
    expect(labels).toHaveLength(8);
    expect(new Set(STAGES.map((s) => s.n)).size).toBe(8);
    expect(labels.slice(0, 7)).toEqual(STAGES.slice(0, 7).map((s) => s.label));
    expect(labels[7]).toBe("Won / Lost / Nurture");
  });
  it("has the six sequence steps of section 10", () => {
    const card = section("reach").blocks.find((b) => b.type === "cards");
    const tl = card && card.type === "cards" ? card.cards[1]!.find((b) => b.type === "timeline") : undefined;
    const items = tl && tl.type === "timeline" ? tl.items : [];
    expect(items.map((i) => i.when)).toEqual(SEQUENCE.map((s) => `Day ${s.day}`));
    expect(items.map((i) => strongText(i.title) || (i.title[0] as string))).toEqual(SEQUENCE.map((s) => s.title));
  });
});

const lead = (over: Partial<LeadState> = {}): LeadState => ({
  stage: "demo_built", replied: false, first_contact_date: null, demo_built_date: null, sequence_step: 0, next_action_date: null, ...over,
});

describe("next-action dates", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-01-30", 2)).toBe("2026-02-01");
    expect(addDays("2026-12-30", 5)).toBe("2027-01-04");
  });
  it("moving to Contacted sets the first contact and a Day 2 call", () => {
    const p = stageChangePatch(lead(), "contacted", "2026-10-01");
    expect(p).toMatchObject({ stage: "contacted", first_contact_date: "2026-10-01", sequence_step: 1, next_action_date: "2026-10-03" });
  });
  it("keeps an existing first contact date", () => {
    expect(stageChangePatch(lead({ first_contact_date: "2026-09-20", sequence_step: 2 }), "contacted", "2026-10-01").next_action_date).toBe("2026-09-25");
  });
  it("walks the whole sequence as touches are logged", () => {
    let l = lead({ ...stageChangePatch(lead(), "contacted", "2026-10-01") } as Partial<LeadState>);
    const dates: (string | null)[] = [l.next_action_date];
    for (let i = 0; i < 6; i++) {
      l = { ...l, ...touchPatch(l) };
      dates.push(l.next_action_date);
    }
    expect(dates).toEqual(["2026-10-03", "2026-10-06", "2026-10-10", "2026-10-15", "2026-11-15", null, null]);
  });
  it("stops the sequence when they reply, win or lose", () => {
    const l = lead({ stage: "contacted", first_contact_date: "2026-10-01", sequence_step: 1, next_action_date: "2026-10-03" });
    expect(stageChangePatch(l, "replied", "2026-10-02")).toMatchObject({ replied: true, next_action_date: null });
    expect(stageChangePatch(l, "lost", "2026-10-02").next_action_date).toBeNull();
  });
  it("gives nurture a follow-up date, never a deletion", () => {
    const l = lead({ first_contact_date: "2026-10-01" });
    expect(stageChangePatch(l, "nurture", "2026-10-05").next_action_date).toBe("2026-11-15"); // day 45
    expect(stageChangePatch(l, "nurture", "2026-12-01").next_action_date).toBe("2027-03-01"); // quarterly after that
  });
  it("records the demo built date once", () => {
    expect(stageChangePatch(lead(), "demo_built", "2026-10-01").demo_built_date).toBe("2026-10-01");
    expect(stageChangePatch(lead({ demo_built_date: "2026-09-01" }), "demo_built", "2026-10-01").demo_built_date).toBe("2026-09-01");
  });
  it("has no next action before first contact", () => expect(nextActionDate(null, 1)).toBeNull());
});

describe("live ratios", () => {
  const ev = (lead_id: string, to_stage: LeadState["stage"]) => ({ lead_id, to_stage });
  it("counts leads that reached each stage, jumps included", () => {
    const events = [ev("a", "sourced"), ev("a", "qualified"), ev("b", "sourced"), ev("c", "contacted"), ev("d", "won")];
    const r = reached(events);
    expect(r.atLeast.slice(1, 8)).toEqual([4, 3, 2, 2, 1, 1, 1]);
    expect(r.won).toBe(1);
  });
  it("says not enough data below 100 leads", () => {
    const r = liveRatios([ev("a", "sourced")], 99);
    expect(r.contactedToReplied).toEqual({ enough: false, leads: 99 });
    expect(formatRatio(r.contactedToReplied)).toBe("Not enough data");
  });
  it("computes a ratio from 100 leads", () => {
    const events = Array.from({ length: 100 }, (_, i) => ev(`l${i}`, "contacted")).concat(
      Array.from({ length: 4 }, (_, i) => ev(`l${i}`, "replied")),
    );
    const r = liveRatios(events, MIN_LEADS);
    expect(formatRatio(r.contactedToReplied)).toBe("4%");
    expect(formatRatio(r.repliedToCall)).toBe("0%");
    expect(formatRatio(r.proposalToWon)).toBe("No leads at this stage yet");
  });
});

describe("CSV export", () => {
  const row: LeadRow = {
    date_sourced: "2026-10-01", business_name: 'Acme "Fence", Co', owner_first_name: "Sam", category: "Fencing & gates", city: "Austin", state: "TX",
    phone: "+1 512 555 0100", email: "", instagram_handle: "@acme", facebook_page: "", google_maps_url: "", website_found: false, website_url: "",
    site_verdict: "", google_review_count: 42, google_rating: 4.6, followers: null, last_post_date: null, score: 8, tier: "hot", demo_url: "",
    demo_built_date: null, first_contact_date: "2026-10-01", channel: "instagram_dm", replied: false, stage: "contacted",
    next_action_date: "2026-10-03", notes: "line one\nline two",
  };
  it("has the exact 28-column header of the original", () => {
    expect(COLS).toHaveLength(28);
    expect(CSV_HEADER).toBe(COLS.join(","));
    expect(leadsToCsv([]).split("\r\n")[0]).toBe(
      "Date sourced,Business name,Owner first name,Category,City,State,Phone,Email,Instagram handle,Facebook page,Google Maps URL,Website found?,Website URL,Site verdict,Google review count,Google rating,Followers,Last post date,Score /10,Tier,Demo URL,Demo built date,First contact date,Channel,Replied?,Stage,Next action date,Notes",
    );
  });
  it("writes 28 cells per row in column order", () => {
    const cells = leadCells(row);
    expect(cells).toHaveLength(28);
    expect(cells[COLS.indexOf("Tier")]).toBe("Hot");
    expect(cells[COLS.indexOf("Stage")]).toBe("Contacted");
    expect(cells[COLS.indexOf("Channel")]).toBe("Instagram DM");
    expect(cells[COLS.indexOf("Website found?")]).toBe("No");
    expect(cells[COLS.indexOf("Next action date")]).toBe("2026-10-03");
  });
  it("quotes commas, quotes and line breaks", () => {
    const line = leadsToCsv([row]).split("\r\n").slice(1).join("\r\n");
    expect(line).toContain('"Acme ""Fence"", Co"');
    expect(line).toContain('"line one\nline two"');
  });
  it("defuses spreadsheet formulas but keeps phone numbers", () => {
    expect(safeCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(safeCell("@acme")).toBe("'@acme");
    expect(safeCell("-2+3")).toBe("'-2+3");
    expect(safeCell("+1 512 555 0100")).toBe("+1 512 555 0100");
  });
});

describe("lead form", () => {
  const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
  it("needs a business name", () => expect(parseLeadForm(fd({})).ok).toBe(false));
  it("reads the fields and the ten checks", () => {
    const r = parseLeadForm(fd({ business_name: " Acme ", state: "tx", google_rating: "4.5", google_review_count: "12", website_found: "no", check_owner_run: "on", channel: "call" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({ business_name: "Acme", state: "TX", google_rating: 4.5, google_review_count: 12, website_found: false, channel: "call" });
      expect(Object.keys(r.value.checks)).toEqual([...CHECK_FIELDS]);
      expect(Object.values(r.value.checks).filter(Boolean)).toHaveLength(1);
    }
  });
  it.each([
    [{ business_name: "x", state: "ZZ" }],
    [{ business_name: "x", google_rating: "9" }],
    [{ business_name: "x", followers: "-3" }],
    [{ business_name: "x", last_post_date: "10/01/2026" }],
  ])("rejects %j", (bad) => expect(parseLeadForm(fd(bad)).ok).toBe(false));
});
