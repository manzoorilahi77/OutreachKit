// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { BoardContent } from "./types";

export const BOARD_CONTENT: BoardContent = {
  columns: [
    { sort: "name", label: "Category" },
    { sort: "fam", label: "Family" },
    { sort: "tkt", label: "Their job value" },
    { sort: "price", label: "Your build price" },
    { sort: "gap", label: "No real site" },
    { sort: "score", label: "Score" },
    { sort: "tier", label: "Tier" },
    { label: "Read" },
  ],
};
