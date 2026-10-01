// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Section } from "../types";

export const board: Section = {
  id: "board",
  num: "03",
  title: "The category board",
  sub: "Every service category worth considering, with their job value, what you can charge, the share running with no real website, and the seven-factor score. Filter by family or tier. Sort by clicking a column header.",
  blocks: [{ type: "widget", id: "board" }],
};
