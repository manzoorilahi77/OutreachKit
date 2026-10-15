// The IT finder's categories: IT and digital businesses that buy white-label development (segment "agency").
// Kept apart from the Board and the Kit Console: these rows have no website kit and never appear there.
//
// Scores use The Outreach Reset's six segment factors, 1–5 each, higher is better: budget, buys often, reachable,
// accepts offshore, proof fit, visible trigger (docs/source/outreach-reset.html, section 04). The Reset scores
// "US digital & web agencies" 3 5 4 5 4 4 = 25; each row here is a judgement relative to that row, not measured data,
// and every row is unreviewed until the owner approves it. `mapsLabels` are the Google Maps category labels the search
// is expected to return; check them on the first runs.
import type { Country } from "@/lib/market/regions";

export type Fit = "strong" | "fits" | "no";

export interface ItCategory {
  /** The name shown, and the words searched on Maps ("Web design agencies in Austin, TX"). */
  n: string;
  /** Budget, buys often, reachable, accepts offshore, proof fit, visible trigger. */
  scores: readonly [number, number, number, number, number, number];
  mapsLabels: readonly string[];
  /** Why they buy, and what to offer. */
  note: string;
  fit: Record<Country, Fit>;
}

export const IT_FACTORS = ["Budget", "Buys often", "Reachable", "Accepts offshore", "Proof fit", "Visible trigger"] as const;

const ALL: Record<Country, Fit> = { US: "strong", CA: "fits", AE: "fits" };

export const IT_CATEGORIES: readonly ItCategory[] = [
  {
    n: "Web design agencies", scores: [3, 5, 4, 5, 5, 4], mapsLabels: ["Website designer", "Web design agency"], fit: ALL,
    note: "Overflow builds every busy month. WordPress, React and booking or ordering back ends they can't staff.",
  },
  {
    n: "Digital marketing agencies", scores: [3, 5, 4, 5, 4, 4], mapsLabels: ["Internet marketing service", "Marketing agency"], fit: ALL,
    note: "Sell sites and landing pages with their campaigns but rarely keep developers. The Reset's first test segment.",
  },
  {
    n: "Software companies", scores: [4, 4, 3, 4, 4, 4], mapsLabels: ["Software company"], fit: ALL,
    note: "Small software houses with more contracts than engineers. Offer a trial developer or one fixed-price feature.",
  },
  {
    n: "Mobile app developers", scores: [3, 4, 3, 4, 3, 3], mapsLabels: ["Software company", "Mobile app developer"], fit: ALL,
    note: "App studios short of back-end and web capacity: APIs, admin portals, web versions of the app.",
  },
  {
    n: "SEO agencies", scores: [3, 4, 4, 5, 3, 3], mapsLabels: ["Internet marketing service", "Search engine optimization agency"], fit: ALL,
    note: "Need site rebuilds, speed fixes and technical SEO work done under their brand.",
  },
  {
    n: "E-commerce agencies", scores: [3, 4, 3, 4, 4, 4], mapsLabels: ["E-commerce service", "Internet marketing service"], fit: ALL,
    note: "Shopify and WooCommerce builds plus custom integrations: ordering, stock, delivery. Fits the ordering portfolio.",
  },
  {
    n: "Advertising agencies", scores: [4, 3, 3, 4, 3, 3], mapsLabels: ["Advertising agency"], fit: ALL,
    note: "Campaign microsites and landing pages on deadlines. Bigger budgets, fewer repeat builds.",
  },
  {
    n: "Branding and design studios", scores: [2, 4, 4, 5, 3, 3], mapsLabels: ["Graphic designer", "Design agency"], fit: ALL,
    note: "Design the site but don't build it. A development partner lets them sell the whole job.",
  },
  {
    n: "IT services companies", scores: [3, 3, 3, 3, 3, 3], mapsLabels: ["Computer support and services", "IT services"], fit: ALL,
    note: "Managed IT firms whose clients ask for portals, integrations and automation they don't build in-house.",
  },
  {
    n: "IT consultants", scores: [3, 3, 4, 4, 3, 3], mapsLabels: ["Computer consultant", "Business management consultant"], fit: ALL,
    note: "Advise on systems and need a build partner to deliver what they recommend.",
  },
  {
    n: "Social media agencies", scores: [2, 3, 4, 4, 2, 3], mapsLabels: ["Social media agency", "Marketing agency"], fit: { US: "fits", CA: "fits", AE: "strong" },
    note: "Clients ask them for websites and booking pages. Smaller budgets; a referral partner more than a buyer.",
  },
  {
    n: "Marketing consultants", scores: [2, 3, 4, 4, 2, 3], mapsLabels: ["Marketing consultant"], fit: ALL,
    note: "Solo consultants who resell builds to their clients. Small tickets, quick decisions.",
  },
];

export const itCategoryTotal = (c: ItCategory): number => c.scores.reduce((a, b) => a + b, 0);
export const findItCategory = (n: string): ItCategory | undefined => IT_CATEGORIES.find((c) => c.n === n);
/** Best first, then by name. */
export const itCategoriesFor = (country: Country): ItCategory[] =>
  IT_CATEGORIES.filter((c) => c.fit[country] !== "no").slice().sort((a, b) => itCategoryTotal(b) - itCategoryTotal(a) || a.n.localeCompare(b.n));
