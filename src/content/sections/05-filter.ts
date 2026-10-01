// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Section } from "../types";

export const filter: Section = {
  id: "filter",
  num: "05",
  title: "Filtering — who is actually a lead",
  sub: "Two passes. The first asks whether they have a real website. The second asks whether they can pay you and whether you can reach them. Both should take under a minute per business.",
  blocks: [
    { type: "h3", inline: ["Pass one — what \"no real website\" looks like"] },
    {
      type: "cards",
      cols: 2,
      cards: [
        [
          { type: "h4", inline: ["Hard signals — treat as no website"] },
          {
            type: "list",
            ordered: false,
            items: [
              [
                "The Google Business Profile shows only ",
                { strong: ["Directions"] },
                " and ",
                { strong: ["Call"] },
                ". No Website button at all. The strongest signal there is.",
              ],
              [
                "The Website button points at ",
                { mono: "facebook.com" },
                ", ",
                { mono: "instagram.com" },
                ", ",
                { mono: "linktr.ee" },
                ", a Yelp / Angi / Thumbtack / Houzz / Nextdoor / BBB profile, or a phone-number-only landing card.",
              ],
              [
                "The domain is a dead free host: ",
                { mono: "*.business.site" },
                " (Google shut these off in 2024), ",
                { mono: "*.wixsite.com" },
                ", ",
                { mono: "*.godaddysites.com" },
                ", ",
                { mono: "*.square.site" },
                ", ",
                { mono: "*.weebly.com" },
                ", ",
                { mono: "*.blogspot.com" },
                ", ",
                { mono: "*.myshopify.com" },
                " for a service trade.",
              ],
              [
                "The listing shows ",
                { strong: ["\"Claim this business\""] },
                ", or is unverified, or the name is misspelled — nobody is minding it.",
              ],
            ],
          },
        ],
        [
          { type: "h4", inline: ["Soft signals — a site exists but is worthless"] },
          {
            type: "list",
            ordered: false,
            items: [
              [
                "Open it on your phone. Text does not reflow, buttons are too small, you have to pinch. Ten seconds decides it.",
              ],
              ["No phone number in the header, or the number does not tap-to-call."],
              ["No quote form anywhere, or a form that only asks for an email."],
              ["Footer says ", { strong: ["© 2016"] }, ", or the last blog post is four years old."],
              ["No HTTPS, or a certificate warning."],
              ["Takes more than four seconds to paint on cellular."],
              ["Zero project photos, or photos that are obviously stock."],
            ],
          },
          {
            type: "p",
            inline: [
              "Soft-signal businesses are a ",
              { strong: ["better"] },
              " sale than no-site businesses in one way: they already believe a website is worth paying for. They just got a bad one.",
            ],
            variant: "fine",
          },
        ],
      ],
    },
    { type: "h3", inline: ["Pass two — disqualify fast"] },
    {
      type: "card",
      blocks: [
        {
          type: "ticks",
          items: [
            {
              mark: "×",
              inline: [
                { strong: ["Franchises and national brands."] },
                " The website is corporate's. There is no sale here, ever.",
              ],
            },
            {
              mark: "×",
              inline: [
                { strong: ["Anything with 500+ reviews or 20+ trucks."] },
                " They have a marketing manager and a contract.",
              ],
            },
            {
              mark: "×",
              inline: [
                { strong: ["Sub-$500 average job with no recurring."] },
                " They physically cannot justify $1,500.",
              ],
            },
            {
              mark: "×",
              inline: [
                { strong: ["Fewer than 5 reviews and nothing posted in a year."] },
                " The business may be dead. Verify before you spend an hour.",
              ],
            },
            {
              mark: "×",
              inline: [
                { strong: ["Outside your service radius by more than one metro."] },
                " You want to be able to say \"I'm in [their city]\" and mean it.",
              ],
            },
            {
              mark: "×",
              inline: [
                { strong: ["An agency footer on a site that looks decent."] },
                " You are pitching against an incumbent for a rebuild. Different, slower sale.",
              ],
            },
            {
              mark: "×",
              inline: [
                { strong: ["Every review inside the same two weeks."] },
                " Bought reviews. Not a business you want your name on.",
              ],
            },
          ],
        },
      ],
    },
    { type: "h3", inline: ["The 30-second scorer"] },
    {
      type: "p",
      inline: [
        "Every check is visible on the listing or one tap away. Tick as you go; the verdict updates live and survives a page reload.",
      ],
      variant: "sub",
    },
    { type: "widget", id: "scorer" },
    {
      type: "scorerVerdict",
      fine: [
        "Hot 8–10 · Warm 5–7 · Skip under 5. A partly scored lead comes back marked ",
        { em: ["carried over"] },
        " after a reload; ",
        { strong: ["Next lead"] },
        " clears it.",
      ],
    },
  ],
};
