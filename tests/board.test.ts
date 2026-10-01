import { describe, expect, it } from "vitest";
import { DEFAULT_SORT, boardRows, nextSort } from "@/lib/board";

describe("board", () => {
  it("shows all 124 sorted by score, best first", () => {
    const rows = boardRows("all", "all", DEFAULT_SORT);
    expect(rows).toHaveLength(124);
    expect(rows[0]!.idx).toBe(90); // cabinet refinishing & painting, per section 02
    expect(rows.map((r) => r.idx)).toEqual([...rows.map((r) => r.idx)].sort((a, b) => b - a));
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
