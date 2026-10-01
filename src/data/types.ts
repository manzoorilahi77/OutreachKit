export type FamKey =
  | "out" | "ext" | "int" | "mech" | "clean" | "auto" | "care"
  | "food" | "event" | "edu" | "pet" | "b2b" | "pro";

export type ArchKey =
  | "quote" | "emergency" | "book" | "enroll" | "rfq" | "menu" | "event" | "consult" | "catalog";

/** [name, comma-free list of cities joined by "|"] */
export type StateEntry = [name: string, cities: string];

export interface Family {
  l: string;
  src: string[];
  bp: string[];
  /** [offer, price, why] */
  up: string[][];
  season: string;
  pitch: string;
}

/** [name, family, ticket, price, gap, seven factor digits, note, searches "|", tags "|", licensed 0/1] */
export type BoardRow = [
  name: string, fam: FamKey, tkt: string, price: string, gap: string, digits: string,
  note: string, q: string, t: string, lic: number,
];

/** [themeId, name, mode, bg, surface, text, muted, accent, positive, negative, type]. Client demo palettes, not app UI. */
export type StyleEntry = [
  themeId: string, name: string, mode: string, bg: string, surface: string, text: string,
  muted: string, accent: string, positive: string, negative: string, type: string,
];

export interface Archetype {
  l: string;
  goal: string;
  cta: string[];
  reg: string;
  sec: string[];
  routes: string[];
  form: string[];
  schema: string;
  con: string[];
  done: string[];
}

/** AI and care-plan upsell: [name, oneTimeLo, oneTimeHi, recurringLo, recurringHi, pitchLine, note] */
export type UpsellRow = [
  name: string, lo: number, hi: number, recLo: number, recHi: number, line: string, note: string,
];

/** Cross-sell: [name, who, valueLo, valueHi, line, note] */
export type CrossRow = [
  name: string, who: string, lo: number, hi: number, line: string, note: string,
];

export interface Template {
  repo: string;
  readme: string;
  owns: string[];
  tokens: string[];
  routes: string[];
}

/** Scorer check: [label, how to tell] */
export type CheckRow = [label: string, hint: string];
