import { describe, expect, it } from "vitest";
import { DEFAULT_LIMIT, DailyBudget, LIMIT_OPTIONS, isLimitOption, localDay, savedTodayLabel } from "@/lib/scrape/limits";
import { emptyCounters, progressLine } from "@/lib/scrape/types";

describe("daily limit", () => {
  it("offers 20, 50, 70 and 100, defaulting to 50", () => {
    expect([...LIMIT_OPTIONS]).toEqual([20, 50, 70, 100]);
    expect(DEFAULT_LIMIT).toBe(50);
    expect(isLimitOption(70)).toBe(true);
    expect(isLimitOption(60)).toBe(false);
    expect(isLimitOption("50")).toBe(false);
  });

  it("starts from what is already saved today and stops at the ceiling", () => {
    const b = new DailyBudget(18, 20, "2026-10-09");
    expect(b.remaining).toBe(2);
    expect(b.reached).toBe(false);
    expect(b.record()).toBe(true);
    expect(b.record()).toBe(true);
    expect(b.reached).toBe(true);
    expect(b.record()).toBe(false);
    expect(b.saved).toBe(20);
    expect(b.remaining).toBe(0);
  });

  it("is already reached when today's saves meet the limit, or exceed it after a lower limit was chosen", () => {
    expect(new DailyBudget(50, 50).reached).toBe(true);
    expect(new DailyBudget(60, 50).remaining).toBe(0);
    expect(new DailyBudget(60, 100).remaining).toBe(40);
  });

  it("uses the local calendar day, not UTC", () => {
    expect(localDay(new Date(2026, 9, 9, 23, 59, 59))).toBe("2026-10-09");
    expect(localDay(new Date(2026, 0, 2, 0, 0, 0))).toBe("2026-01-02");
  });

  it("notices when the day rolls over during a run", () => {
    const b = new DailyBudget(0, 20, "2026-10-09");
    expect(b.rolledOver(new Date(2026, 9, 9, 23, 59))).toBe(false);
    expect(b.rolledOver(new Date(2026, 9, 10, 0, 1))).toBe(true);
  });

  it("words the counter and the progress line", () => {
    expect(savedTodayLabel(7, 50)).toBe("Saved today: 7 of 50");
    expect(progressLine({ ...emptyCounters(), checked: 23, saved: 7, withWebsite: 5, withoutWebsite: 2 })).toBe(
      "Checked 23 · saved 7 · with website 5 · without website 2",
    );
    expect(progressLine({ ...emptyCounters(), checked: 5, skippedDuplicate: 2, unreadable: 1, leadsRefused: 3 })).toBe(
      "Checked 5 · saved 0 · with website 0 · without website 0 · 2 already saved · 1 unreadable · 3 not added to leads",
    );
  });
});
