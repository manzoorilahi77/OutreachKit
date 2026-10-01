// Extracted verbatim from docs/source/territory-desk.html by scripts/extract-data.ts.
// Do not edit by hand: run `pnpm extract:data`, and `pnpm parity` will confirm it still matches.

import type { Template } from "./types";

export const TPL: Template = {
  repo: "https://github.com/manzoorilahi77/base-website",
  readme: "https://github.com/manzoorilahi77/base-website/blob/main/README.md",
  owns: [
    "site.config.ts — every business token in one file",
    "The 50-combo theme system — set themeId, never hand-write palette values",
    "The SEO layer — Metadata API, JSON-LD, generated /opengraph-image and /icon, /sitemap.xml, /robots.txt, all read from site.config.ts",
    "deliverContactForm() in src/lib/contact-form.ts — the form delivery hook",
    "/style-guide — theme preview, noindex",
    "/demo-shots — section screenshots, noindex",
    "public/placeholder.svg",
    "CLAUDE.md (symlinked as AGENTS.md) — the working rules for this repo",
  ],
  tokens: [
    "{{BUSINESS_NAME}}",
    "{{TAGLINE}}",
    "{{DOMAIN}}",
    "{{PHONE}}",
    "{{EMAIL}}",
    "{{STREET_ADDRESS}}",
    "{{CITY}}",
    "{{STATE}}",
    "{{POSTAL_CODE}}",
    "{{HOURS}}",
    "{{SEO_DESCRIPTION}}",
  ],
  routes: [
    "/",
    "/contact",
    "/style-guide",
    "/demo-shots",
    "/sitemap.xml",
    "/robots.txt",
    "/opengraph-image",
    "/icon",
  ],
};
