// Extracted verbatim from docs/source/territory-desk.html by scripts/extract-data.ts.
// Do not edit by hand: run `pnpm extract:data`, and `pnpm parity` will confirm it still matches.

import type { FamKey } from "./types";

export const TONE: Record<FamKey, string> = {
  out: "Confident and grounded. Trade language, no marketing adjectives. Short sentences.",
  ext: "Reassuring and credible. Homeowners are worried about damage and cost — answer both early.",
  int: "Warm and design-aware, but concrete about budget and timeline.",
  mech: "Urgent and plain. Availability and response time above everything.",
  clean: "Friendly, specific, price-transparent. Remove every reason to hesitate.",
  auto: "Enthusiast-facing. Show the work, name the products and brands, keep copy tight.",
  care: "Calm, spacious and personal. Written by the practitioner, not an agency.",
  food: "Appetite-first. Short, sensory, current. Hours and location impossible to miss.",
  event: "Emotive but organised. Every section ends in a date-check or enquiry.",
  edu: "Parent-facing. Safety, credentials, schedule, price — in that order.",
  pet: "Warm and safety-conscious. Owners are leaving family behind.",
  b2b: "Plain and specification-led. Capabilities, capacity, certifications. No stock photography, no adjectives.",
  pro: "Credible and precise. Credentials up front, plain language about who they help.",
};
