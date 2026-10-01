// UI strings the original's script writes into the console (status line, hints). Ported by hand from
// docs/source/territory-desk.html; wording unchanged.
export const CONSOLE_STRINGS = {
  noCategory: "No category",
  noCity: "No city",
  awaiting: "Awaiting category",
  ready: "Ready — build the kit.",
  stillNeeded: (missing: string[]) => "Still needed: " + missing.join(" · ") + ".",
  missing: {
    cat: "Step 1 — pick a category",
    dev: "Step 2 — pick desktop or phone",
    st: "Step 3 — pick a state",
    city: "Step 3 — pick or type a city",
  },
  catHint: (n: number) => n + " categories, best first",
  selectState: "Select a state…",
  selectStateFirst: "Select a state first",
  selectCity: "Select a city…",
  cityNote: (n: number, stName: string) =>
    n + " cities listed for " + stName + " — the largest markets plus the higher-income suburbs that matter most for local service work. Not every incorporated place; type yours if it is missing.",
  built: (cat: string, city: string, st: string) => "Kit built for " + cat + " in " + city + ", " + st + ".",
  allFamilies: "All",
} as const;
