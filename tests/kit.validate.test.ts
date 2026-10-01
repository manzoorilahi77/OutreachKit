import { describe, expect, it } from "vitest";
import { validateKit } from "@/lib/kit/validate";
import { safeNext } from "@/lib/safe-next";

describe("validateKit", () => {
  const ok = { category: "Fencing & gates", device: "desktop", state: "TX", city: "Austin" };
  it("accepts a listed city", () => expect(validateKit(ok)).toEqual({ ok: true, value: { ...ok, cityIsFree: false } }));
  it("marks a typed city as free", () => {
    const r = validateKit({ ...ok, city: " Siloam Springs ", state: "AR" });
    expect(r.ok && r.value.city).toBe("Siloam Springs");
    expect(r.ok && r.value.cityIsFree).toBe(true);
  });
  it.each([
    [{ ...ok, category: "Nope" }],
    [{ ...ok, device: "tablet" }],
    [{ ...ok, state: "ZZ" }],
    [{ ...ok, city: "  " }],
  ])("rejects %j", (bad) => expect(validateKit(bad).ok).toBe(false));
});

describe("safeNext", () => {
  it("keeps same-site paths", () => expect(safeNext("/leads?x=1")).toBe("/leads?x=1"));
  it.each(["https://evil.com", "//evil.com", "/\\evil", "", null, undefined])("rejects %s", (v) => expect(safeNext(v as string)).toBe("/"));
});
