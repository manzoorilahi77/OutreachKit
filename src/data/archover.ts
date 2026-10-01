// Extracted verbatim from docs/source/territory-desk.html by scripts/extract-data.ts.
// Do not edit by hand: run `pnpm extract:data`, and `pnpm parity` will confirm it still matches.

import type { ArchKey } from "./types";

export const ARCHOVER: Record<string, ArchKey> = {
  "Pool cleaning & service": "book",
  "Pressure washing & soft wash": "book",
  "Window cleaning": "book",
  "Commercial janitorial": "rfq",
  "Snow & ice management": "rfq",
  "Moving companies": "quote",
  "Pest control": "book",
  "Collision & body shop": "quote",
  "Towing & roadside": "emergency",
  "Septic & sewer": "quote",
  "Well drilling & water treatment": "quote",
  "Foundation repair": "quote",
  "Sign shops & vehicle graphics": "quote",
  "Security & alarm install": "quote",
  "Staffing & recruiting agencies": "consult",
  "Equipment & tool rental": "catalog",
  "Portable toilet & dumpster rental": "catalog",
  "Event & party rentals": "catalog",
  "Bounce house & inflatable rentals": "catalog",
  Caterers: "event",
  "Bakeries & custom cakes": "event",
  "Therapists & counsellors": "consult",
  "Chiropractic clinics": "consult",
  "Physical therapy & small clinics": "consult",
  "Home care & senior care": "consult",
  "Med spa & injectables": "consult",
  "Dog training": "enroll",
  "Home inspectors": "book",
  "Daycare & preschool": "enroll",
  "Appliance repair": "book",
  "Auto glass": "book",
  "Independent auto repair": "book",
};
