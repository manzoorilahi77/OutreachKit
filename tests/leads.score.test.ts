import { describe, expect, it } from "vitest";
import { CHECKS } from "@/data";
import { scoreOf, verdictOf } from "@/lib/leads/score";

describe("scorer", () => {
  it("has ten checks", () => expect(CHECKS).toHaveLength(10));
  it("counts ticked checks", () => expect(scoreOf([true, false, true, true])).toBe(3));
  it.each([[0, "skip"], [4, "skip"], [5, "warm"], [7, "warm"], [8, "hot"], [10, "hot"]] as const)(
    "score %i is %s",
    (n, v) => expect(verdictOf(n)).toBe(v),
  );
});
