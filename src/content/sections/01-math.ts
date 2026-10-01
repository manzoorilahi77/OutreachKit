// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Section } from "../types";

export const math: Section = {
  id: "math",
  num: "01",
  title: "The market, and the only four numbers that matter",
  sub: "You are not selling to \"small business.\" You are selling to a specific kind of operator: owner-run, revenue between roughly $150k and $2M, does physical work, and has never had a reason to sit down for two days and build a website.",
  blocks: [
    {
      type: "stats",
      items: [
        {
          label: "US small businesses",
          value: "~34M",
          note: "Roughly 27M are non-employer, one-person or family operations",
        },
        {
          label: "Estimated with no real site",
          value: "~25–30%",
          note: "A Facebook page, a Linktree or a dead builder page is not a site",
        },
        {
          label: "Per mid-size metro",
          value: "300–900",
          note: "Qualified no-site prospects in a single good category, one metro",
        },
        {
          label: "You need to close",
          value: "2–4 / mo",
          note: "At $2,000 average build + $80/mo care plan",
        },
      ],
    },
    {
      type: "note",
      tone: "plain",
      inline: [
        { strong: ["The whole business in one line."] },
        " 250 profiles sourced → 100 qualified → 100 contacted → 12–18 replies → 5–7 calls → 2–3 closes. Every number below exists to make one of those six arrows less leaky. If you close three builds a month at $2,000 and keep 70% on a $80/month care plan, you are at $72k of build revenue and roughly $20k of recurring by the end of year one.",
      ],
    },
    {
      type: "cards",
      cols: 2,
      cards: [
        [
          { type: "h3", inline: ["Why \"no website\" is the right wedge"] },
          {
            type: "list",
            ordered: false,
            items: [
              [
                { strong: ["The pain is legible."] },
                " You can show them the gap in ten seconds: their competitor ranks, they do not.",
              ],
              [
                { strong: ["No incumbent to displace."] },
                " You are not fighting an agency, a nephew, or a two-year contract.",
              ],
              [
                { strong: ["The buyer is the owner."] },
                " One decision-maker, no committee, no procurement.",
              ],
              [
                { strong: ["It opens a recurring door."] },
                " The site is the low-price entry; hosting, reviews, Maps, and ads are where the business actually lives.",
              ],
            ],
          },
        ],
        [
          { type: "h3", inline: ["Where beginners lose money"] },
          {
            type: "list",
            ordered: false,
            items: [
              [
                { strong: ["Chasing every category at once."] },
                " Your pitch, your demo, and your search strings only get sharp inside one vertical.",
              ],
              [
                { strong: ["Selling a website."] },
                " Nobody wants a website. They want the phone to ring in a slow month.",
              ],
              [
                { strong: ["Picking a ticket that is too small."] },
                " A $200-per-job operator will not spend $1,500. Ticket size is the single hardest filter to fix later.",
              ],
              [
                { strong: ["Picking a category agencies already farm."] },
                " Roofing, HVAC and personal injury get pitched daily. You are the fourth call that week.",
              ],
              [
                { strong: ["No recurring attached."] },
                " A build-only shop restarts from zero every month, forever.",
              ],
            ],
          },
        ],
      ],
    },
  ],
};
