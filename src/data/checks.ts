// Extracted verbatim from docs/source/territory-desk.html by scripts/extract-data.ts.
// Do not edit by hand: run `pnpm extract:data`, and `pnpm parity` will confirm it still matches.

import type { CheckRow } from "./types";

export const CHECKS: CheckRow[] = [
  [
    "No real website",
    "No Website button, or it points at Facebook, Linktree, a directory profile or a dead free host",
  ],
  [
    "Owner-run, not a franchise",
    "First-person captions, “family owned”, the owner's face and name somewhere on the profile",
  ],
  [
    "Active in the last 30 days",
    "A post, a photo on the Google profile, or a review reply inside the last month",
  ],
  ["Older than three months", "Scroll to the bottom of the grid, or check the first review date"],
  [
    "Inside your service radius",
    "City in the bio or profile, and the last three jobs geotagged nearby",
  ],
  [
    "Job value fits your price",
    "The work shown is worth at least three times what you plan to charge",
  ],
  [
    "Between 5 and 200 reviews",
    "Real but not a giant. Under 5 may be dead; over 200 has a marketing budget already",
  ],
  [
    "Reachable directly",
    "Phone in the bio or on the listing, a public business email, or DMs plainly open",
  ],
  ["Real demand signal", "Comments asking price or availability, or reviews mentioning a wait"],
  [
    "Second channel confirmed",
    "Two of: Google listing, Instagram, Facebook page, licence registry entry",
  ],
];
