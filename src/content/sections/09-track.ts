// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Section } from "../types";

export const track: Section = {
  id: "track",
  num: "09",
  title: "Tracking",
  sub: "One sheet, eight pipeline stages, six ratios. If a lead is not in the sheet it does not exist, and you will contact the same person twice in three weeks and look like a bot.",
  blocks: [
    {
      type: "cards",
      cols: 2,
      cards: [
        [
          { type: "h4", inline: ["Pipeline stages"] },
          {
            type: "steps",
            items: [
              {
                n: "01",
                inline: [{ strong: ["Sourced"] }, " — name and handle captured, not yet checked"],
              },
              {
                n: "02",
                inline: [{ strong: ["Qualified"] }, " — scored 5+, no real site confirmed"],
              },
              {
                n: "03",
                inline: [{ strong: ["Demo built"] }, " — one-page mockup live on a subdomain"],
              },
              { n: "04", inline: [{ strong: ["Contacted"] }, " — first message sent, date logged"] },
              {
                n: "05",
                inline: [{ strong: ["Replied"] }, " — any human response, including \"no\""],
              },
              { n: "06", inline: [{ strong: ["Call booked"] }, " — time on the calendar"] },
              { n: "07", inline: [{ strong: ["Proposal sent"] }, " — price and scope in writing"] },
              {
                n: "08",
                inline: [
                  { strong: ["Won / Lost / Nurture"] },
                  " — nurture gets a follow-up date, never a deletion",
                ],
              },
            ],
          },
        ],
        [
          { type: "h4", inline: ["The six ratios to watch weekly"] },
          {
            type: "table",
            head: [],
            rows: [
              [{ kind: "name", inline: ["Profiles per hour"] }, { kind: "n", inline: ["40 – 60"] }],
              [
                { kind: "name", inline: ["Sourced → Qualified"] },
                { kind: "n", inline: ["35 – 45%"] },
              ],
              [
                { kind: "name", inline: ["Contacted → Replied"] },
                { kind: "n", inline: ["12 – 20%"] },
              ],
              [
                { kind: "name", inline: ["Replied → Call booked"] },
                { kind: "n", inline: ["35 – 50%"] },
              ],
              [{ kind: "name", inline: ["Call → Proposal"] }, { kind: "n", inline: ["60 – 75%"] }],
              [{ kind: "name", inline: ["Proposal → Won"] }, { kind: "n", inline: ["30 – 40%"] }],
            ],
          },
          {
            type: "p",
            inline: [
              "These are planning targets to calibrate against, not measured results. Replace each one with your own number as soon as you have 100 real data points — then you will know whether your problem is sourcing, the message, or the call.",
            ],
            variant: "fine",
          },
        ],
      ],
    },
    {
      type: "card",
      blocks: [
        { type: "h4", inline: ["The tracking sheet"] },
        {
          type: "p",
          inline: [
            "One row per business, 28 columns. Click below, then click cell A1 in a new Google Sheet and paste.",
          ],
        },
        { type: "widget", id: "copyHeader", label: "Copy the 28-column header row" },
        { type: "p", inline: [], variant: "fine" },
      ],
    },
  ],
};
