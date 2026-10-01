import { describe, expect, it } from "vitest";
import { BRAND, LOGOS } from "@/lib/brand";
import { ratio, tint } from "@/lib/contrast";

const { navy, charcoal, warm, electric } = { navy: BRAND.navy.hex, charcoal: BRAND.charcoal.hex, warm: BRAND.warm.hex, electric: BRAND.electric.hex };

describe("brand contrast", () => {
  it("body and heading text pass AA on the page field", () => {
    expect(ratio(charcoal, warm)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(navy, warm)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(warm, navy)).toBeGreaterThanOrEqual(4.5);
  });
  it("muted text at 72% passes AA in light and dark", () => {
    expect(ratio(tint(charcoal, warm, 0.72), warm)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(tint(warm, navy, 0.72), navy)).toBeGreaterThanOrEqual(4.5);
  });
  it("Electric Blue is only usable for UI shapes (3:1), not small text", () => {
    expect(ratio(electric, warm)).toBeGreaterThanOrEqual(3);
    expect(ratio(electric, navy)).toBeGreaterThanOrEqual(3);
    expect(ratio(electric, warm)).toBeLessThan(4.5);
  });
  it("logo aspect ratios match the brand kit", () => {
    expect(LOGOS["primary-blue"].w / LOGOS["primary-blue"].h).toBeCloseTo(4.0589, 3);
    expect(LOGOS["wordmark-white"].w / LOGOS["wordmark-white"].h).toBeCloseTo(4.4106, 3);
  });
});
