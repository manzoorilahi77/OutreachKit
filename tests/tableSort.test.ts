import { describe, expect, it } from "vitest";
import { paginate, sortRows } from "@/lib/tableSort";

const rows = [{ n: "Lead 10", s: 3 }, { n: "Lead 2", s: null }, { n: "lead 1", s: 9 }, { n: "", s: 1 }];

describe("sortRows", () => {
  it("sorts text naturally and ignores case", () => {
    expect(sortRows(rows, (r) => r.n, "asc").map((r) => r.n)).toEqual(["lead 1", "Lead 2", "Lead 10", ""]);
  });
  it("sorts numbers numerically, descending too, with empty values last either way", () => {
    expect(sortRows(rows, (r) => r.s, "asc").map((r) => r.s)).toEqual([1, 3, 9, null]);
    expect(sortRows(rows, (r) => r.s, "desc").map((r) => r.s)).toEqual([9, 3, 1, null]);
  });
  it("is stable, and leaves the order alone with no sort key", () => {
    const same = [{ k: 1, id: "a" }, { k: 1, id: "b" }, { k: 0, id: "c" }];
    expect(sortRows(same, (r) => r.k, "asc").map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(sortRows(same, undefined, "asc")).toEqual(same);
  });
});

describe("paginate", () => {
  const ten = Array.from({ length: 10 }, (_, i) => i + 1);
  it("slices a page and reports the range", () => {
    expect(paginate(ten, 2, 4)).toEqual({ rows: [5, 6, 7, 8], page: 2, pages: 3, from: 5, to: 8, total: 10 });
    expect(paginate(ten, 3, 4)).toMatchObject({ rows: [9, 10], from: 9, to: 10 });
  });
  it("clamps the page and handles an empty list", () => {
    expect(paginate(ten, 99, 4).page).toBe(3);
    expect(paginate(ten, 0, 4).page).toBe(1);
    expect(paginate([], 1, 25)).toEqual({ rows: [], page: 1, pages: 1, from: 0, to: 0, total: 0 });
  });
});
