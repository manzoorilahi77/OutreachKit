// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Section } from "../types";

export const sell: Section = {
  id: "sell",
  num: "06",
  title: "What else you sell them",
  sub: "The site is the door, not the business. A build-only shop starts every month at zero. Aim to have 60–70% of monthly revenue recurring by the end of year one.",
  blocks: [
    {
      type: "table",
      head: [["Product"], ["Type"], ["US price range"], ["Why they say yes"]],
      rows: [
        [
          { kind: "name", inline: ["Starter site — 3 pages"] },
          { inline: ["One-time"] },
          { kind: "n", inline: ["$900 – $1,500"] },
          {
            inline: [
              "Home, services, contact. The \"just get me online\" tier. Use it to buy your first two case studies.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Standard site — 5–7 pages + 3 city pages"] },
          { inline: ["One-time"] },
          { kind: "n", inline: ["$1,800 – $3,500"] },
          {
            inline: ["Your default. City pages are the part that actually produces ranked traffic."],
          },
        ],
        [
          { kind: "name", inline: ["Premium — 10+ pages, booking, photo day"] },
          { inline: ["One-time"] },
          { kind: "n", inline: ["$4,000 – $7,500"] },
          { inline: ["For $20k-job categories. Sell it as \"one job pays for it.\""] },
        ],
        [
          { kind: "name", inline: ["Care plan — hosting, backups, edits, uptime"] },
          { kind: "mono", inline: ["Recurring"] },
          { kind: "n", inline: ["$49 – $149 / mo"] },
          {
            inline: [
              "Attach it to ",
              { strong: ["every"] },
              " build, no exceptions. Never hand over a site with no plan.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Google Business Profile management"] },
          { kind: "mono", inline: ["Recurring"] },
          { kind: "n", inline: ["$200 – $400 / mo"] },
          {
            inline: [
              "Weekly posts, photo uploads, Q&A, category and service edits. For most local trades the profile out-earns the website.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Review generation system"] },
          { kind: "mono", inline: ["Recurring"] },
          { kind: "n", inline: ["$99 – $249 / mo"] },
          {
            inline: [
              "Post-job text and email asking for a Google review. The single highest-ROI thing you can sell a 30-review contractor.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Missed-call text-back"] },
          { kind: "mono", inline: ["Recurring"] },
          { kind: "n", inline: ["$99 – $199 / mo"] },
          {
            inline: [
              "A crew on a roof cannot answer. An auto-text inside 30 seconds recovers jobs they are losing today — and you can prove it in the logs.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Local SEO retainer"] },
          { kind: "mono", inline: ["Recurring"] },
          { kind: "n", inline: ["$600 – $1,500 / mo"] },
          {
            inline: [
              "Service-area pages, citations, on-page, links. Only sell this once you can actually deliver it.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Google Ads / Local Services Ads management"] },
          { kind: "mono", inline: ["Recurring"] },
          { kind: "n", inline: ["$500 – $1,000 / mo + spend"] },
          {
            inline: [
              "For categories with real emergency intent. LSA in particular converts hard for licensed trades.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Photo & short-video day"] },
          { inline: ["One-time"] },
          { kind: "n", inline: ["$600 – $1,500"] },
          {
            inline: [
              "Their biggest content problem. Half a day on a job site gives you a year of site and social assets.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Booking / scheduling setup"] },
          { inline: ["Both"] },
          { kind: "n", inline: ["$300 – $800 + $50/mo"] },
          {
            inline: ["Non-negotiable for salons, trainers, groomers, detailers, studios, clinics."],
          },
        ],
        [
          { kind: "name", inline: ["Quote-to-CRM pipeline"] },
          { inline: ["Both"] },
          { kind: "n", inline: ["$400 – $1,200 + $75/mo"] },
          {
            inline: ["Form submissions into a pipeline with reminders, so leads stop dying in an inbox."],
          },
        ],
        [
          { kind: "name", inline: ["Email & SMS list"] },
          { kind: "mono", inline: ["Recurring"] },
          { kind: "n", inline: ["$150 – $400 / mo"] },
          {
            inline: [
              "Seasonal offers to past customers. Cheapest revenue a local business has and almost none of them do it.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Logo & basic brand kit"] },
          { inline: ["One-time"] },
          { kind: "n", inline: ["$300 – $900"] },
          { inline: ["Easy add during the build when their current logo is clip art."] },
        ],
        [
          { kind: "name", inline: ["Truck / yard-sign / card artwork"] },
          { inline: ["One-time"] },
          { kind: "n", inline: ["$200 – $600"] },
          {
            inline: [
              "Physical, immediately visible, and it makes you their designer rather than their web guy.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Hiring page + application flow"] },
          { inline: ["Both"] },
          { kind: "n", inline: ["$400 – $900 + $50/mo"] },
          {
            inline: [
              "Trades and care agencies are desperate for crew. Sometimes an easier first sale than the marketing site.",
            ],
          },
        ],
      ],
    },
    {
      type: "note",
      tone: "plain",
      inline: [
        { strong: ["Sell in this order."] },
        " Build → care plan (same contract, same day) → Google Business Profile + reviews at day 30 → ads or SEO at day 90, once the site has data to point at. Pitching a $1,000/month retainer to someone who has never spent a dollar on marketing is how you lose an easy $2,000 build.",
      ],
    },
  ],
};
