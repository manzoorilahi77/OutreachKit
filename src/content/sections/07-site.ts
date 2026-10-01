// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Section } from "../types";

export const site: Section = {
  id: "site",
  num: "07",
  title: "What the website has to look like",
  sub: "A local service site has one job: turn a stranger who is standing in their driveway holding a phone into a phone call. Everything below serves that. The builder in section 04 adds the parts specific to your category.",
  blocks: [
    {
      type: "cards",
      cols: 2,
      cards: [
        [
          { type: "h4", inline: ["The spine — every category, in this order"] },
          {
            type: "steps",
            items: [
              {
                n: "01",
                inline: [
                  { strong: ["Above the fold."] },
                  " Service + city in the headline. One line of proof. A tap-to-call number and a \"Get a free estimate\" button, both visible without scrolling.",
                ],
              },
              {
                n: "02",
                inline: [
                  { strong: ["Sticky call bar on mobile."] },
                  " Fixed to the bottom of the screen, always. This one element moves conversion more than the rest of the page combined.",
                ],
              },
              {
                n: "03",
                inline: [
                  { strong: ["Trust strip."] },
                  " Licensed & insured, years in business, review count and star rating, warranty, financing if they offer it.",
                ],
              },
              {
                n: "04",
                inline: [
                  { strong: ["Services grid."] },
                  " Four to eight, each with a real photo and one plain sentence. No jargon.",
                ],
              },
              {
                n: "05",
                inline: [
                  { strong: ["Proof."] },
                  " Twelve to twenty of ",
                  { em: ["their own"] },
                  " project photos. Before/after pairs where the category allows it. Never stock.",
                ],
              },
              {
                n: "06",
                inline: [
                  { strong: ["Reviews."] },
                  " Pulled from Google, with names and dates. Link out to the profile so they are verifiable.",
                ],
              },
              {
                n: "07",
                inline: [
                  { strong: ["How it works."] },
                  " Three or four steps from first call to finished job. This removes the fear of being sold to.",
                ],
              },
              {
                n: "08",
                inline: [
                  { strong: ["Service area."] },
                  " A real list of the towns they cover, each linking to its own page. This is the SEO engine.",
                ],
              },
              {
                n: "09",
                inline: [
                  { strong: ["FAQ."] },
                  " Price ranges, timeline, permits, warranty, payment. Answer the awkward ones honestly.",
                ],
              },
              {
                n: "10",
                inline: [
                  { strong: ["Quote form."] },
                  " Name, phone, city, service, photo upload, best time to call. Six fields maximum.",
                ],
              },
              {
                n: "11",
                inline: [
                  { strong: ["Footer NAP."] },
                  " Name, address, phone typed ",
                  { em: ["character-for-character"] },
                  " the same as the Google profile.",
                ],
              },
            ],
          },
        ],
        [
          { type: "h4", inline: ["The technical floor — non-negotiable"] },
          {
            type: "list",
            ordered: false,
            items: [
              [
                { strong: ["Mobile first."] },
                " Most of their traffic is a phone held one-handed in a driveway.",
              ],
              [
                { strong: ["Under 2.5 seconds to largest paint"] },
                " on a mid-range Android over cellular.",
              ],
              [
                { strong: ["Images compressed to WebP"] },
                " and sized. Contractor photos are 8MB straight off a phone.",
              ],
              [
                { strong: ["HTTPS"] },
                " and a domain ",
                { strong: ["they own"] },
                ", registered in their name, not yours.",
              ],
              [
                { strong: ["LocalBusiness schema"] },
                " with hours, geo, service area and price range.",
              ],
              [
                { strong: ["Analytics plus a tracked phone number"] },
                " so you can show them, in month two, exactly what you produced. This is what renews the care plan.",
              ],
              [
                { strong: ["Readable contrast and real focus states."] },
                " A meaningful share of their customers are over 60.",
              ],
              [
                { strong: ["One page per service, one page per city."] },
                " A single stuffed home page ranks for nothing.",
              ],
            ],
          },
          {
            type: "note",
            tone: "cool",
            inline: [
              { strong: ["Design register, by category."] },
              " Trades want ",
              { em: ["heavy, credible, high-contrast"] },
              " — big type, dense proof, phone everywhere. Personal care and wellness want ",
              { em: ["calm, spacious, photographic"] },
              " — booking button above the fold. B2B and commercial want ",
              { em: ["plain, specification-led"] },
              " — capabilities, certifications, a quote request form, and no stock photography at all.",
            ],
          },
        ],
      ],
    },
  ],
};
