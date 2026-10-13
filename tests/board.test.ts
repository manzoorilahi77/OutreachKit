import { describe, expect, it } from "vitest";
import { DEFAULT_SORT, boardRows, nextSort } from "@/lib/board";
import { EXT_CATS } from "@/lib/kit/categories";

describe("board", () => {
  it("shows the original 124 plus the new small-business categories, sorted by score, best first", () => {
    const rows = boardRows("all", "all", DEFAULT_SORT);
    expect(rows.filter((r) => !r.ext)).toHaveLength(124);
    expect(rows.every((r) => r.size === "small")).toBe(true);
    expect(rows).toHaveLength(124 + EXT_CATS.filter((c) => c.size === "small").length);
    expect(rows[0]!.idx).toBe(90); // cabinet refinishing & painting, per section 02
    expect(rows.map((r) => r.idx)).toEqual([...rows.map((r) => r.idx)].sort((a, b) => b - a));
  });
  it("the Mid-size tab shows only mid-size categories", () => {
    const rows = boardRows("all", "all", DEFAULT_SORT, { size: "mid", country: "US" });
    expect(rows.length).toBeGreaterThan(20);
    expect(rows.every((r) => r.size === "mid" && r.ext)).toBe(true);
  });
  it("a country hides the trades that don't exist there", () => {
    const uae = boardRows("all", "all", DEFAULT_SORT, { size: "small", country: "AE" }).map((r) => r.n);
    expect(uae).not.toContain("Snow & ice management");
    expect(uae).toContain("Pool cleaning & service");
    expect(boardRows("all", "all", DEFAULT_SORT, { size: "small", country: "CA" }).map((r) => r.n)).toContain("Snow & ice management");
  });
  it("healthcare is its own family", () => {
    const rows = boardRows("health", "all", DEFAULT_SORT);
    expect(rows.map((r) => r.n)).toEqual(expect.arrayContaining(["Dental practices", "Chiropractic clinics"]));
    expect(rows.every((r) => r.group === "health")).toBe(true);
  });
  it("filters by family and tier together", () => {
    const rows = boardRows("out", "A", DEFAULT_SORT);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.f === "out" && r.tier === "A")).toBe(true);
  });
  it("sorts text columns ascending first, then flips", () => {
    const s1 = nextSort(DEFAULT_SORT, "name");
    expect(s1).toEqual({ k: "name", dir: 1 });
    const names = boardRows("all", "all", s1).map((r) => r.n);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(nextSort(s1, "name").dir).toBe(-1);
  });
  it("starts numeric columns descending", () => expect(nextSort(DEFAULT_SORT, "gap")).toEqual({ k: "gap", dir: -1 }));
});
