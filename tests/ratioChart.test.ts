import { describe, expect, it } from "vitest";
import { axisMax, clampPct, inlineText, parseTarget, standing } from "@/lib/leads/ratioChart";

describe("ratio chart numbers", () => {
  it("reads the target band from the playbook text", () => {
    expect(parseTarget("35 — 45%")).toEqual({ lo: 35, hi: 45 });
    expect(parseTarget("1 – 5%")).toEqual({ lo: 1, hi: 5 });
    expect(parseTarget("40 — 60")).toEqual({ lo: 40, hi: 60 });
    expect(parseTarget("n/a")).toBeNull();
  });
  it("flattens inline content", () => {
    expect(inlineText(["35 ", { strong: ["— 45"] }, "%"])).toBe("35 — 45%");
  });
  it("picks a round axis with room above the band and the live value", () => {
    expect(axisMax(5, null)).toBe(10);
    expect(axisMax(45, null)).toBe(75);
    expect(axisMax(75, 90)).toBe(100);
    expect(axisMax(5, 20)).toBe(25);
  });
  it("says where the live value stands", () => {
    expect(standing(10, { lo: 35, hi: 45 })).toBe("below");
    expect(standing(40, { lo: 35, hi: 45 })).toBe("inside");
    expect(standing(50, { lo: 35, hi: 45 })).toBe("above");
  });
  it("keeps positions on the track", () => {
    expect(clampPct(50, 100)).toBe(50);
    expect(clampPct(150, 100)).toBe(100);
    expect(clampPct(-5, 100)).toBe(0);
  });
});
