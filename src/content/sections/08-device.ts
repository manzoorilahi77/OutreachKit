// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Section } from "../types";

export const device: Section = {
  id: "device",
  num: "08",
  title: "Desktop or mobile — the actual answer",
  sub: "This is not a preference question. Some sources only exist properly in a phone app, and some tasks are unworkable without tabs and a keyboard. Here is the split, task by task.",
  blocks: [
    {
      type: "table",
      head: [["Task"], ["Use"], ["Why"]],
      rows: [
        [
          { kind: "name", inline: ["Instagram hashtag & location browsing"] },
          { inline: [{ chip: { tone: "hot", text: "Phone app" } }] },
          {
            inline: [
              "Hashtag and place browsing is app-first; the desktop web version is crippled for this. Use the ",
              { strong: ["Recent"] },
              " tab, never ",
              { strong: ["Top"] },
              ".",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Nextdoor business finder"] },
          { inline: [{ chip: { tone: "hot", text: "Phone app" } }] },
          {
            inline: [
              "Neighbourhood recommendation threads are where the truly invisible one-truck operators surface.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Facebook local & trade groups"] },
          { inline: [{ chip: { tone: "hot", text: "Phone app" } }] },
          { inline: ["Group search and \"recommendations\" posts work far better in-app."] },
        ],
        [
          { kind: "name", inline: ["Checking whether their site is broken"] },
          { inline: [{ chip: { tone: "hot", text: "Phone, real device" } }] },
          {
            inline: [
              "Emulators lie about tap targets, font scaling and load time on cellular. Ten seconds on a real phone is the whole test.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Google Maps list scanning"] },
          { inline: [{ chip: { tone: "", text: "Desktop" } }] },
          {
            inline: [
              "The side panel gives you dozens of results at once and you can middle-click every promising one into a tab.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["Yelp, Angi, Thumbtack, Houzz, BBB, chamber directories"] },
          { inline: [{ chip: { tone: "", text: "Desktop" } }] },
          { inline: ["Dense list views, filters, and easy copy-paste into the sheet."] },
        ],
        [
          { kind: "name", inline: ["State licence board & contractor registry lookups"] },
          { inline: [{ chip: { tone: "", text: "Desktop" } }] },
          { inline: ["Government portals are ancient. Many are effectively unusable on a phone."] },
        ],
        [
          { kind: "name", inline: ["Secretary of State business registrations"] },
          { inline: [{ chip: { tone: "", text: "Desktop" } }] },
          {
            inline: [
              "Gives you the owner's legal name and registration date — the two facts that make a cold message land.",
            ],
          },
        ],
        [
          { kind: "name", inline: ["County permit portals"] },
          { inline: [{ chip: { tone: "", text: "Desktop" } }] },
          {
            inline: ["Recently pulled permits tell you exactly who is actively working, this month."],
          },
        ],
        [
          { kind: "name", inline: ["Logging leads and running the pipeline"] },
          { inline: [{ chip: { tone: "", text: "Desktop" } }] },
          { inline: ["Nobody sustains 50 rows a week of data entry on a phone keyboard."] },
        ],
        [
          { kind: "name", inline: ["Building the demo mockup"] },
          { inline: [{ chip: { tone: "", text: "Desktop" } }] },
          { inline: ["Obviously."] },
        ],
        [
          { kind: "name", inline: ["Sending the first DM"] },
          { inline: [{ chip: { tone: "hot", text: "Phone app" } }] },
          {
            inline: [
              "Instagram and Facebook messages from a phone look like a person. From a desktop they read as automated, and are throttled harder.",
            ],
          },
        ],
      ],
    },
    {
      type: "cards",
      cols: 2,
      cards: [
        [
          { type: "h4", inline: ["The verdict"] },
          {
            type: "p",
            inline: [
              { strong: ["Desktop-primary, phone-in-hand."] },
              " Roughly 70% desktop, 30% phone, on the same desk in the same hour. Laptop open on Maps and the sheet; phone next to it for Instagram sourcing, the mobile-broken test, and the first DM. Do not try to run this entirely from a phone — you will source well and track terribly, and untracked leads are not leads.",
            ],
          },
        ],
        [
          { type: "h4", inline: ["Should you build an app or a tool for this?"] },
          {
            type: "p",
            inline: [
              "No — not until you are past roughly 200 leads a week, which is at least six months away. A Google Sheet plus a browser plus your phone handles everything in this manual. Building tooling before you have closed anything is the most common and most comfortable way to avoid selling. Revisit it when data entry genuinely becomes the bottleneck, and even then a free CRM tier will probably beat anything you build.",
            ],
          },
        ],
      ],
    },
  ],
};
