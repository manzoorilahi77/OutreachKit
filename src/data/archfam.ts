// Extracted verbatim from docs/source/territory-desk.html by scripts/extract-data.ts.
// Do not edit by hand: run `pnpm extract:data`, and `pnpm parity` will confirm it still matches.

import type { ArchKey, FamKey } from "./types";

export const ARCHFAM: Record<FamKey, ArchKey> = {
  out: "quote",
  ext: "quote",
  int: "quote",
  mech: "emergency",
  clean: "book",
  auto: "book",
  care: "book",
  food: "menu",
  event: "event",
  edu: "enroll",
  pet: "book",
  b2b: "rfq",
  pro: "consult",
};
