import { expect, it } from "vitest";
import { agoText } from "@/lib/ago";

it("says how long ago, in plain words", () => {
  const now = Date.parse("2026-10-12T12:00:00Z");
  expect(agoText(now - 5_000, now)).toBe("just now");
  expect(agoText(now - 12 * 60_000, now)).toBe("12 min ago");
  expect(agoText(now - 3 * 3_600_000, now)).toBe("3 h ago");
  expect(agoText(now - 3 * 86_400_000, now)).toBe("3 days ago");
  expect(agoText(now + 5_000, now)).toBe("just now");
});
