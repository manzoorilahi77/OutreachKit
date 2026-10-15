import { describe, expect, it } from "vitest";
import { placeFacets } from "@/lib/leads/placeFilters";

const L = (id: string, state: string, city: string, category: string | null, big = false) => ({ id, state, city, category, big });
const leads = [
  L("1", "TX", "Dallas", "Roofing"),
  L("2", "TX", "Austin", "Roofing"),
  L("3", "tx", "dallas", "Plumbing"),
  L("4", "CA", "Fresno", "Plumbing"),
  L("5", "ON", "Toronto", null),
  L("6", "", "", "Roofing"),
  L("7", "TX", "Dallas", "Roofing", true),
];
const all = () => true;

describe("placeFacets", () => {
  it("lists each state once, labelled with its name, alphabetical, with counts", () => {
    const f = placeFacets(leads, {}, all);
    expect(f.states.map((s) => s.v)).toEqual(["CA", "ON", "TX"]);
    expect(f.states.find((s) => s.v === "TX")).toMatchObject({ l: "Texas (TX)", count: 4 });
    expect(f.states.find((s) => s.v === "ON")!.l).toBe("Ontario (ON)");
  });

  it("narrows cities to the chosen state and merges casing", () => {
    const f = placeFacets(leads, { state: "TX" }, all);
    expect(f.cityState).toBe("TX");
    expect(f.cities.map((c) => c.l)).toEqual(["Austin", "Dallas"]);
    expect(f.cities.find((c) => c.l === "Dallas")!.count).toBe(3);
  });

  it("offers no cities until a state is chosen, unless the data holds only one state", () => {
    expect(placeFacets(leads, {}, all).cityState).toBeUndefined();
    expect(placeFacets(leads, {}, all).cities).toEqual([]);
    const one = placeFacets(leads.filter((l) => l.state === "CA"), {}, all);
    expect(one.cityState).toBe("CA");
    expect(one.cities.map((c) => c.l)).toEqual(["Fresno"]);
  });

  it("lists categories present, ignoring leads with none, and counts them against the other place filters", () => {
    const f = placeFacets(leads, { state: "TX" }, all);
    expect(f.categories.map((c) => [c.v, c.count])).toEqual([["Plumbing", 1], ["Roofing", 3]]);
  });

  it("counts states against the category but not against the state itself, and keeps the chosen state listed", () => {
    const f = placeFacets(leads, { state: "CA", category: "Roofing" }, all);
    expect(f.states.map((s) => [s.v, s.count])).toEqual([["CA", 0], ["TX", 3]]);
  });

  it("respects the base filter (country and size) in every count", () => {
    const f = placeFacets(leads, {}, (l) => !l.big);
    expect(f.states.find((s) => s.v === "TX")!.count).toBe(3);
  });

  it("drops selections that match no lead", () => {
    const f = placeFacets(leads, { state: "ZZ", city: "Nowhere", category: "Nothing" }, all);
    expect(f.state).toBeUndefined();
    expect(f.city).toBeUndefined();
    expect(f.category).toBeUndefined();
  });

  it("drops a city that is not in the chosen state", () => {
    expect(placeFacets(leads, { state: "CA", city: "Dallas" }, all).city).toBeUndefined();
    expect(placeFacets(leads, { state: "tx", city: "DALLAS" }, all)).toMatchObject({ state: "TX", city: "Dallas" });
  });

  it("matches leads on every chosen place filter", () => {
    const f = placeFacets(leads, { state: "TX", city: "Dallas", category: "Roofing" }, all);
    expect(leads.filter(f.matches).map((l) => l.id)).toEqual(["1", "7"]);
    expect(leads.filter(placeFacets(leads, {}, all).matches)).toHaveLength(leads.length);
  });
});
