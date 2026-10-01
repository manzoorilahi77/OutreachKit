import { describe, expect, it } from "vitest";
import { EMPTY_CONSOLE, barLine, fromQuery, isReady, statusLine, stateOptions, toKitInput, toQuery } from "@/lib/console";

describe("console state", () => {
  it("is not ready until category, state and city are chosen", () => {
    expect(isReady(EMPTY_CONSOLE)).toBe(false);
    expect(statusLine(EMPTY_CONSOLE)).toBe("Still needed: Step 1 — pick a category · Step 3 — pick a state.");
    const s = { ...EMPTY_CONSOLE, cat: "Fencing & gates", st: "TX" as const };
    expect(statusLine(s)).toBe("Still needed: Step 3 — pick or type a city.");
    expect(statusLine({ ...s, freeCity: " Siloam Springs " })).toBe("Ready — build the kit.");
  });
  it("shows the bar line the original shows", () => {
    expect(barLine(EMPTY_CONSOLE)).toBe("No category  ·  No city");
    expect(barLine({ ...EMPTY_CONSOLE, cat: "Fencing & gates", st: "TX", listCity: "Austin" })).toBe("Fencing & gates  ·  Austin, TX");
  });
  it("a typed city wins over the list", () => {
    const k = toKitInput({ ...EMPTY_CONSOLE, cat: "Fencing & gates", st: "TX", listCity: "Austin", freeCity: "Siloam Springs" });
    expect(k?.city).toBe("Siloam Springs");
  });
  it("round-trips through the URL, and ignores junk", () => {
    const s = { ...EMPTY_CONSOLE, cat: "Fencing & gates", device: "mobile" as const, st: "TX" as const, listCity: "Austin" };
    expect(fromQuery(toQuery(s))).toEqual(s);
    expect(fromQuery("cat=Nope&st=ZZ&city=x")).toEqual(EMPTY_CONSOLE);
    expect(fromQuery("cat=Fencing%20%26%20gates&st=AR&city=Siloam%20Springs").freeCity).toBe("Siloam Springs");
  });
  it("lists all 51 states by name", () => {
    const o = stateOptions();
    expect(o).toHaveLength(51);
    expect(o[0]).toEqual({ code: "AL", label: "Alabama (AL)" });
  });
});
