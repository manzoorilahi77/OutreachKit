// The category kit: one reviewed JSON file per category at src/kits/<kitSlug>.json, layered over
// the ported kit. Mirrors docs/prompts/field-kit-v2/category-kit.schema.json exactly; the schema is
// the contract and pnpm kits:check validates every file against it.

/** kitSlug("Fencing & gates") === "fencing-gates". Unique across the whole board (tests/kits.test.ts). */
export function kitSlug(name: string): string {
  return name.toLowerCase().replace(/&/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export type Unit = "one-time" | "monthly" | "per-job" | "per-year" | "per-shoot" | "per-page" | "per-hour";
export type ReviewStatus = "unreviewed" | "spot-checked" | "approved";
export type DirectionId = "a" | "b" | "c";
export type SiteType =
  | "local-conversion" | "portfolio-showcase" | "premium-brand" | "booking-first" | "menu-and-order"
  | "enrolment" | "catalog" | "editorial-trust" | "emergency-response" | "b2b-capability";
export type HeroLayout = "split-photo" | "full-bleed-photo" | "type-led" | "card-stack" | "before-after" | "menu-board";
export type Tier = "starter" | "standard" | "premium";

export interface PricedItem {
  name: string;
  min: number;
  max: number;
  unit: Unit;
  scalesWithMarket?: boolean;
  pitchLine: string;
  when: string;
}

export interface RouteItem {
  route: string;
  whoPays: string;
  /** 0 with max 0 renders as "Your normal rate", as in the original. */
  min: number;
  max: number;
  unit: Unit;
  pitchLine: string;
  whyItWorks: string;
}

export interface DesignDirection {
  id: DirectionId;
  themeId: string;
  siteType: SiteType;
  name: string;
  heroLayout: HeroLayout;
  mood: [string, string, string];
  bestFor: string;
  pairsWithTier: Tier;
  /** Preview h1. Contains {City}. */
  headlineSample: string;
  whyItFits: string;
}

export interface CategoryOpener {
  angle: string;
  /** What "Copy DM line" copies: no link, no screenshot (Correction 2). */
  line: string;
  hook: string;
  /** Contains {demo-link} exactly once. */
  linkLine: string;
}

export interface CategoryKit {
  schemaVersion: 1;
  category: string;
  slug: string;
  provenance: {
    generatedBy: string;
    generatedAt: string;
    reviewStatus: ReviewStatus;
    reviewedBy?: string | null;
    notes?: string;
  };
  pageStructurePlus: { section: string; contains: string; why: string }[];
  designDirections: DesignDirection[];
  openers: CategoryOpener[];
  sequence: {
    dm1: string;
    dm2: string;
    call: string;
    objections: { objection: string; handler: string }[];
    email: { subject: string; body: string };
    voicemail: string;
    takedown: string;
    nurture: string;
  };
  pricing: {
    bullets: string[];
    lineItems: { item: string; min: number; max: number; unit: Unit; description: string; scalesWithMarket: boolean }[];
  };
  whatElseYouSell: PricedItem[];
  crossSell: { withoutAI: RouteItem[]; withAI: RouteItem[] };
  softwareAI: {
    name: string;
    kind: "software" | "ai" | "automation";
    oneTimeMin: number;
    oneTimeMax: number;
    monthlyMin: number;
    monthlyMax: number;
    pitchLine: string;
    whenAndWhatItTakes: string;
  }[];
  routesToBiggerBuyer: RouteItem[];
  upsellLadder: {
    rung: number;
    day: number;
    offer: string;
    min: number;
    max: number;
    unit: Unit;
    trigger: string;
    line: string;
  }[];
}
