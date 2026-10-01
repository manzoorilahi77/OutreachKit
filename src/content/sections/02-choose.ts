// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Section } from "../types";

export const choose: Section = {
  id: "choose",
  num: "02",
  title: "Choosing your category",
  sub: "Every category on the board is scored on seven factors. Ticket size and no-site rate get double weight, because they are the two you cannot talk your way around.",
  blocks: [
    {
      type: "table",
      head: [["Code"], ["Factor"], ["What a 5 looks like"], ["Weight"]],
      rows: [
        [
          { kind: "mono", inline: ["TKT"] },
          { kind: "name", inline: ["Ticket size"] },
          {
            inline: ["Their average job is $5,000+, so a $2,000 site is a rounding error on two jobs"],
          },
          { kind: "n", inline: ["×2"] },
        ],
        [
          { kind: "mono", inline: ["GAP"] },
          { kind: "name", inline: ["No-site rate"] },
          { inline: ["More than half the operators in the category have no real website"] },
          { kind: "n", inline: ["×2"] },
        ],
        [
          { kind: "mono", inline: ["ROI"] },
          { kind: "name", inline: ["Web actually drives sales"] },
          {
            inline: ["Customers genuinely search Google before buying, rather than only asking a neighbour"],
          },
          { kind: "n", inline: ["×1.5"] },
        ],
        [
          { kind: "mono", inline: ["DEN"] },
          { kind: "name", inline: ["Density per metro"] },
          { inline: ["200+ independent operators in a single metro, so you never run out"] },
          { kind: "n", inline: ["×1"] },
        ],
        [
          { kind: "mono", inline: ["ACC"] },
          { kind: "name", inline: ["Owner access"] },
          { inline: ["The owner answers the phone and their own DMs; no gatekeeper"] },
          { kind: "n", inline: ["×1"] },
        ],
        [
          { kind: "mono", inline: ["REC"] },
          { kind: "name", inline: ["Recurring attach"] },
          {
            inline: ["Obvious month-after-month services: reviews, Maps, ads, booking, seasonal campaigns"],
          },
          { kind: "n", inline: ["×1.5"] },
        ],
        [
          { kind: "mono", inline: ["CLR"] },
          { kind: "name", inline: ["Clear of agencies"] },
          {
            inline: ["Nobody is cold-pitching this vertical, so your message is the only one in the inbox"],
          },
          { kind: "n", inline: ["×1"] },
        ],
      ],
    },
    {
      type: "cards",
      cols: 3,
      cards: [
        [
          { type: "chips", items: [{ tone: "a", text: "Tier A" }] },
          { type: "h3", inline: ["Start here"] },
          {
            type: "p",
            inline: [
              "High ticket, wide gap, and no queue of agencies. These pay for a real site, close in one or two calls, and have an obvious second and third product. Pick one and stay in it for at least 90 days.",
            ],
          },
        ],
        [
          { type: "chips", items: [{ tone: "b", text: "Tier B" }] },
          { type: "h3", inline: ["Workable"] },
          {
            type: "p",
            inline: [
              "One factor is soft — the ticket is thinner, the vertical is busier, or the owner is harder to reach. Good as a second category once your first one is producing, or as your primary in a small market where Tier A runs dry.",
            ],
          },
        ],
        [
          { type: "chips", items: [{ tone: "c", text: "Tier C" }] },
          { type: "h3", inline: ["Know why you are there"] },
          {
            type: "p",
            inline: [
              "Either the money is too thin, the category is agency-saturated, or a website is genuinely not what moves their revenue. Work these only for a specific reason: a warm referral network, a niche you already know, or a booking-tool sale instead of a site.",
            ],
          },
        ],
      ],
    },
    {
      type: "note",
      tone: "cool",
      inline: [
        { strong: ["If you want the short answer."] },
        " The five highest-scoring categories on the board are ",
        { strong: ["cabinet refinishing & painting"] },
        " (90), ",
        { strong: ["fencing & gates"] },
        " (88), ",
        { strong: ["commercial janitorial"] },
        " (87), ",
        { strong: ["parking-lot striping & sealcoating"] },
        " (86) and ",
        { strong: ["artificial turf install"] },
        " (86), with ",
        { strong: ["concrete & stamped driveways"] },
        " and ",
        { strong: ["epoxy floor coatings"] },
        " a point behind. Big enough jobs to pay you, deeply under-webbed, visual enough that a portfolio obviously helps, and almost nobody is pitching them. If you would rather sell recurring revenue than one-off builds, start with ",
        { strong: ["commercial janitorial"] },
        ", ",
        { strong: ["daycare & preschool"] },
        " or ",
        { strong: ["martial arts schools"] },
        " — lower build prices, far higher lifetime value.",
      ],
    },
  ],
};
