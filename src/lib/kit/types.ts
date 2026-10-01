import type { Archetype, FamKey, StateCode } from "@/data";
import type { Inline } from "@/content/types";

export type Device = "desktop" | "mobile";

/** What the console collects. Step 4 (name, brand, domain) is optional and comes from the profile. */
export interface KitInput {
  /** Category name exactly as it appears on the board. */
  cat: string;
  device: Device;
  st: StateCode;
  /** A listed city, or any free-typed city. */
  city: string;
  you?: string;
  brand?: string;
  domain?: string;
}

export interface Category {
  i: number;
  n: string;
  f: FamKey;
  tkt: string;
  price: string;
  gap: string;
  /** The seven factor scores: TKT GAP ROI DEN ACC REC CLR */
  d: number[];
  idx: number;
  tier: "A" | "B" | "C";
  note: string;
  q: string[];
  t: string[];
  lic: boolean;
}

export interface PriceModel {
  min: number; max: number; rec: number;
  proofLo: number; proofHi: number;
  starterLo: number; starterHi: number;
  premLo: number; premHi: number;
  careMin: number; careMax: number; careRec: number;
}

/** The object the original calls X, shared by openers, messages and the build prompt. */
export interface KitContext {
  city: string; st: string; stName: string; cat: string; catL: string; tkt: string; q0: string;
  fam: FamKey; arch: Archetype; famPitch: string; famBp: string[]; tone: string; nearby: string;
  price: PriceModel; pricedBecause: string; demo: string; you: string; brand: string; demoPattern: string;
}

/** [angle, the line, the hook, the link line] */
export type Opener = [angle: string, line: string, hook: string, link: string];
/** [label, body] */
export type Message = [label: string, body: string];
export type RunBlock = [when: string, title: string, text: string];

export interface SectionPlan {
  reuse: [n: string, name: string, template: string, spec: string][];
  build: [n: string, name: string, spec: string][];
}

// ---- the rendered kit, as data ----
export type Cell = { kind?: "name" | "n" | "pitch" | "small"; inline: Inline[] };

export type KitNode =
  | { k: "h4"; inline: Inline[] }
  | { k: "p"; tone: "prose" | "fine" | "muted"; inline: Inline[] }
  | { k: "chips"; items: string[] }
  | { k: "steps"; items: { n: string; inline: Inline[] }[] }
  | { k: "list"; items: Inline[][] }
  | { k: "pairs"; items: { dt: string; dd: Inline[]; small?: boolean }[] }
  | { k: "copyBlock"; label: string; text: string }
  | { k: "openers"; items: Opener[] }
  | { k: "table"; head: string[]; minWidth: number; rows: Cell[][] }
  | { k: "timeline"; items: RunBlock[] }
  | { k: "ups"; items: { name: string; price: string; why: string }[] };

export interface KitSection {
  id: string;
  nodes: KitNode[];
}

export interface Kit {
  input: KitInput;
  header: { title: string; chips: { text: string; tone?: "a" | "b" | "c" | "hot" }[]; note: string };
  sections: KitSection[];
}
