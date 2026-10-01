// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Section } from "../types";

export const reach: Section = {
  id: "reach",
  num: "10",
  title: "Outreach",
  sub: "The message is not \"do you need a website.\" It is a specific observation about their business, plus something you already made for them.",
  blocks: [
    {
      type: "cards",
      cols: 2,
      cards: [
        [
          { type: "h4", inline: ["The demo-first method"] },
          {
            type: "list",
            ordered: true,
            items: [
              [
                "Before you contact anyone, build a ",
                { strong: ["one-page mockup"] },
                " using their real name, real photos from their Instagram or Google profile, and their real service area. Ninety minutes with a template.",
              ],
              ["Put it on a subdomain: ", { mono: "theirname.yourstudio.com" }, "."],
              ["Screenshot it on a phone."],
              [
                "Send the screenshot as the ",
                { em: ["first"] },
                " message. You are no longer asking for their time; you are showing them something that already exists with their name on it.",
              ],
              [
                "Take it down after 30 days if they do not respond. Say so in the message — it is honest and it creates a real deadline.",
              ],
            ],
          },
          {
            type: "p",
            inline: [
              "Use only images they published publicly, and take the demo down if they ask. Never imply the site is already live.",
            ],
            variant: "fine",
          },
        ],
        [
          { type: "h4", inline: ["The contact sequence"] },
          {
            type: "timeline",
            items: [
              {
                when: "Day 0",
                title: ["Instagram or Facebook DM"],
                text: [
                  "One specific compliment about a recent job, one sentence on what you noticed missing, the demo screenshot, one question.",
                ],
              },
              {
                when: "Day 2",
                title: ["Call the published business line"],
                text: [
                  "Mid-morning or after 5pm. Trades answer from the truck. \"I sent you something on Instagram — did it come through?\"",
                ],
              },
              {
                when: "Day 5",
                title: ["Email the public business address"],
                text: [
                  "Subject line is their business name and city. Link to the live demo. Include your physical address and an opt-out.",
                ],
              },
              {
                when: "Day 9",
                title: ["Second call, different time of day"],
                text: ["Different window than day 2. Leave one voicemail, only once."],
              },
              {
                when: "Day 14",
                title: ["The takedown note"],
                text: [
                  "\"Taking the demo down Friday — want me to leave it up?\" Highest-response message in the sequence.",
                ],
              },
              {
                when: "Day 45",
                title: ["Nurture"],
                text: [
                  "Seasonal hook tied to their trade. Then quarterly. Never delete a lead who did not say no.",
                ],
              },
            ],
          },
        ],
      ],
    },
    {
      type: "note",
      tone: "cool",
      inline: [
        { strong: ["The filled-in version lives in the builder."] },
        " Section 04 generates all of this written out for your exact category and city — fifteen opening lines, all eight messages in the sequence with the objection handlers, the AI prompt that builds the sample site, and your price bands with the minimum and maximum for each tier. This section is the method; the kit is the copy.",
      ],
    },
    {
      type: "note",
      tone: "warn",
      inline: [
        { strong: ["Stay clean."] },
        " Manual browsing only — scraping Instagram, Google Maps or Yelp violates their terms and gets accounts banned. Cold ",
        { strong: ["email"] },
        " to a public business address is legal under CAN-SPAM if you include a real physical address and a working opt-out, and you honour it within ten days. Cold ",
        { strong: ["SMS"] },
        " is a different animal: TCPA and several state statutes carry per-message penalties, and most local business numbers are mobile. Do not cold-text. Call, DM, or email. Check your state's rules before you assume a business number is exempt from do-not-call.",
      ],
    },
  ],
};
