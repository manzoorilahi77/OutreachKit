// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Section } from "../types";

export const kit: Section = {
  id: "kitsec",
  num: "04",
  title: "Field kit builder",
  sub: "Choose the category, choose where you will do the work, then narrow to a state and a city. The kit that comes out is the exact set of searches, hashtags, directories, prices, site blueprint and daily run for that combination.",
  blocks: [{ type: "widget", id: "console" }],
};
