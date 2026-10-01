// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { Section } from "../types";

export const ninety: Section = {
  id: "ninety",
  num: "11",
  title: "The first 90 days",
  sub: "One category. One metro. One 60-minute block a day. Everything else is a distraction until you have three paying clients.",
  blocks: [
    {
      type: "timeline",
      items: [
        {
          when: "Week 1",
          title: ["Pick and prove the category"],
          text: [
            "Run the builder. Verify the hashtags actually have volume and drop any under ~200 posts. Confirm the job-value range against two or three real local quotes — that number is your entire price anchor. Set up the sheet.",
          ],
        },
        {
          when: "Weeks 2–3",
          title: ["Build the template and two demos"],
          text: [
            "One reusable template for your category, filled with real content. Two spec demos for real local businesses, with clearly marked placeholders in place of their photos until they give written permission. This is the only week you are allowed to spend on design.",
          ],
        },
        {
          when: "Weeks 3–6",
          title: ["Source 200, contact 200"],
          text: [
            "Five 60-minute blocks a week. Fifty qualified leads a week. Send every single one a text-only first message, then the demo screenshot once they reply. Expect roughly 2–10 replies and 1–5 calls across the period (planning estimates).",
          ],
        },
        {
          when: "Weeks 5–8",
          title: ["First two closes, at a discount"],
          text: [
            "Charge $900–$1,200 for the first two in exchange for a filmed testimonial, photos, and permission to name them. Attach the care plan anyway — discount the build, never the recurring.",
          ],
        },
        {
          when: "Weeks 8–12",
          title: ["Raise the price, add the second product"],
          text: [
            "Full price now that you have proof in the same category and city. Sell Google Business Profile management and the review system to the clients you already have — the easiest revenue on this page.",
          ],
        },
        {
          when: "Day 90",
          title: ["Decide: widen or deepen"],
          text: [
            "Same category, next metro (your template and pitch carry over — fastest path) or same metro, adjacent category (your local proof carries over — better for referrals). Pick one. Not both.",
          ],
        },
      ],
    },
  ],
};
