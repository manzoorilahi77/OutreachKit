// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Inline } from "./types";

export const FOOTER: Inline[][] = [
  [
    { strong: ["On the numbers."] },
    " Job values, no-site percentages, factor scores and funnel ratios on this page are planning estimates built from category structure and typical US pricing — they are not measured survey data for your market. Treat them as a starting hypothesis and replace each one with your own figure as soon as you have real quotes and a hundred real leads. Hashtag and search-string ",
    { em: ["patterns"] },
    " are reliable; their post volume in your specific city is not, so verify on the first pass and cross out whatever produces nothing.",
  ],
  [
    { strong: ["On conduct."] },
    " Manual searching only. No scraping, no automated messaging, no fake reviews, no implying a demo is live. Register domains in the client's name. Everything you sell should be something you can actually deliver next Tuesday.",
  ],
];
