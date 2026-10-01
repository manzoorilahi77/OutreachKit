// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Masthead } from "./types";

export const MASTHEAD: Masthead = {
  tag: "United States · National Prospecting Manual",
  title: "Famysys Outreach Kit",
  lede: [
    "Pick one category of local business, pick one city, and work a repeatable daily block until you have a pipeline of owners running a real trade on a Facebook page and a phone number. This is the category math, the search kit, the qualifying filter, the site you build them, and everything else you sell them after.",
  ],
  rules: [
    { label: "Coverage", value: "50 states + DC" },
    { label: "Categories rated", value: { dynamic: "categories" } },
    { label: "Cities listed", value: { dynamic: "cities" } },
    { label: "Daily block", value: "60 minutes" },
    { label: "Target", value: "50 leads / week" },
  ],
  nav: [
    { id: "math", label: "01  Market math" },
    { id: "choose", label: "02  Choosing a category" },
    { id: "board", label: "03  Category board" },
    { id: "kit", label: "04  Field kit builder" },
    { id: "filter", label: "05  Filtering" },
    { id: "sell", label: "06  What else you sell" },
    { id: "site", label: "07  The website" },
    { id: "device", label: "08  Desktop vs mobile" },
    { id: "track", label: "09  Tracking" },
    { id: "reach", label: "10  Outreach" },
    { id: "ninety", label: "11  First 90 days" },
  ],
};
