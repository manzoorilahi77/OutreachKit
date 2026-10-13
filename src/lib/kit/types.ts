import type { Archetype, ArchKey, FamKey } from "@/data";
import type { Inline } from "@/content/types";
import type { Fit, GroupKey, Size } from "./extBoard";
import type { Country, RegionCode } from "@/lib/market/regions";
import type { SiteLang } from "@/lib/market/notes";

export type Device = "desktop" | "mobile";

/** What the console collects. Step 4 (name, brand, domain) is optional and comes from the profile. */
export interface KitInput {
  /** Category name exactly as it appears on the board. */
  cat: string;
  device: Device;
  /** A US state, a Canadian province or a UAE emirate. The country follows from the code. */
  st: RegionCode;
  /** A listed city, or any free-typed city. */
  city: string;
  you?: string;
  brand?: string;
  domain?: string;
  /** UAE only: the prospect site's language, read by the market layer (src/lib/market). */
  lang?: SiteLang;
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
  // ---- the catalogue layer (src/lib/kit/extBoard.ts). The port's 124 rows leave these unset except size and group. ----
  /** Small business or mid-size. */
  size: Size;
  /** The family the Board and the console list it under. Equal to f except for healthcare. */
  group: GroupKey;
  /** True for categories beyond the port's board. */
  ext?: boolean;
  /** Site archetype override for a new category (the port's own overrides stay in ARCHOVER). */
  arch?: ArchKey;
  /** Care plan [min, max, recommended] override for a new category. */
  care?: [number, number, number];
  /** Where it sells. */
  fit: Record<Country, Fit>;
  /** For a mid-size version: the small category it grows out of. */
  smallOf?: string;
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
  | { k: "copyBlock"; label: string; text: string; pairs?: { term: string; def: string }[] }
  | { k: "openers"; items: Opener[] }
  | { k: "table"; head: string[]; minWidth: number; rows: Cell[][] }
  | { k: "timeline"; items: RunBlock[] }
  | { k: "ups"; items: { name: string; price: string; why: string }[] }
  // Category-kit nodes (src/lib/kit-v2). The ported kit never produces these.
  | { k: "directions"; items: DirectionCard[]; selected: "a" | "b" | "c" }
  | { k: "tabs"; tabs: { label: string; table: { head: string[]; minWidth: number; rows: Cell[][] } }[] }
  | { k: "ladder"; rungs: LadderRung[] };

/** One design direction as the picker draws it: the combo resolved from the vendored theme library. */
export interface DirectionCard {
  id: "a" | "b" | "c";
  letter: "A" | "B" | "C";
  name: string;
  siteType: string;
  tier: string;
  heroLayout: string;
  mood: string[];
  bestFor: string;
  whyItFits: string;
  headline: string;
  themeId: string;
  themeName: string;
  mode: "light" | "dark";
  colors: { role: "bg" | "surface" | "text" | "muted" | "accent" | "positive" | "negative"; hex: string }[];
  /** Label colour for text on the accent, chosen by the template's pickReadable. */
  onAccent: string;
  /** Muted text made AA-safe the way the template does it (ensureContrast). */
  mutedText: string;
  type: { id: string; name: string; fonts: string; display: string; body: string };
  preview: { business: string; ctas: [string, string]; services: string[]; trust: string[] };
}

export interface LadderRung { rung: number; day: number; offer: string; price: string; trigger: string; line: string }

export interface KitSection {
  id: string;
  nodes: KitNode[];
}

export interface Kit {
  input: KitInput;
  header: { title: string; chips: { text: string; tone?: "a" | "b" | "c" | "hot" }[]; note: string };
  sections: KitSection[];
}
