// Playbook sections beyond the ported eleven: mid-size companies, healthcare practices, and selling in Canada and the
// UAE. Written for the expansion (docs/expansion/), not extracted from the original, so `pnpm parity` never sees them.
// Every figure is a planning range, never a market fact.
import type { Inline, Section } from "@/content/types";

const midsize: Section = {
  id: "midsize",
  num: "12",
  title: "Mid-size companies",
  sub: "The same method with a bigger buyer: managers instead of an owner, several locations, a website that already exists, and a system to sell instead of a page.",
  blocks: [
    { type: "p", inline: ["Mid-size here means roughly ten to a few hundred staff, or several locations. They are on the Board under the ", { strong: ["Mid-size"] }, " tab and carry a Mid-size badge everywhere else. Some are the grown-up version of a small category (HVAC with a fleet of vans, a dental group); some only exist at this size (manufacturers, private schools, distributors)."] },
    {
      type: "table",
      head: [["What changes"], ["Small business"], ["Mid-size"]],
      rows: [
        [{ kind: "name", inline: ["Who decides"] }, { inline: ["The owner, alone, often the same day"] }, { inline: ["A manager who owns the problem, plus one or two people who sign"] }],
        [{ kind: "name", inline: ["Their website"] }, { inline: ["None, or a free page"] }, { inline: ["They have one. It is slow on a phone, has no booking or quoting, and one page covers every location"] }],
        [{ kind: "name", inline: ["What you sell first"] }, { inline: ["A site and the care plan"] }, { inline: ["A system: booking, location pages, a portal, recruiting, an integration with what they already run"] }],
        [{ kind: "name", inline: ["Build price (planning)"] }, { inline: ["About $1k–5k"] }, { inline: ["About $10k–40k, often in phases"] }],
        [{ kind: "name", inline: ["Care plan (planning)"] }, { inline: ["$49–149 a month"] }, { inline: ["$299–999 a month, with a support window and reporting"] }],
        [{ kind: "name", inline: ["Sales cycle"] }, { inline: ["Days"] }, { inline: ["Weeks. Plan for a second meeting and a written proposal"] }],
        [{ kind: "name", inline: ["What proves you"] }, { inline: ["The spec demo"] }, { inline: ["A spec demo of one location page and one flow, plus a one-page plan"] }],
      ],
    },
    { type: "h4", inline: ["Finding them"] },
    {
      type: "list",
      ordered: false,
      items: [
        ["Google Maps searches that return the same brand at several addresses. Several listings, one weak site: that is the opener."],
        ["Job posts. A company hiring technicians, nurses or drivers is growing, and a careers page that doesn't exist is costing them applicants."],
        ["LinkedIn company pages, to find the operations, marketing or practice manager by title. Message the person who owns the problem, not the founder."],
        ["Trade association and chamber member lists, and supplier dealer lists, for manufacturers and distributors."],
      ],
    },
    { type: "h4", inline: ["The first message"] },
    {
      type: "list",
      ordered: false,
      items: [
        ["Lead with one thing you can see that costs them work: no online booking, a PDF menu, five locations on one page, a careers link that goes nowhere."],
        ["Never offer a redesign. Offer to fix one flow, and show it."],
        ["Keep it as short as the small-business version. Managers read on phones between meetings too."],
      ],
    },
    { type: "h4", inline: ["The demo and the proposal"] },
    {
      type: "steps",
      items: [
        { n: "01", inline: ["Build one location or service page and the one flow you named (booking, quote, enquiry), on the same demo domain. Marked placeholders for every photo, as always."] },
        { n: "02", inline: ["Ask for twenty minutes with the manager and whoever signs. Show the flow on a phone first."] },
        { n: "03", inline: ["Send a one-page proposal in phases: the flow and the location pages first, then the portal or integration. A paid discovery week is normal at this size."] },
        { n: "04", inline: ["Put the care plan in the first contract, with a response time you can keep."] },
      ],
    },
    { type: "note", tone: "warn", inline: ["Mid-size prices on the Board and in the kits are planning figures in US dollars. Check them against your first two proposals before you treat them as real, and never promise an outcome in numbers."] },
  ],
};

const healthcare: Section = {
  id: "healthcare",
  num: "13",
  title: "Healthcare practices",
  sub: "Dental, eye, hearing, skin, therapy, clinics and centres: high-value bookings, patients who research before they call, and rules you can sell as part of the work.",
  blocks: [
    { type: "p", inline: ["Healthcare is its own family on the Board, at both sizes. Small practices sit next to the original's chiropractic, physical therapy, therapist, home care and med spa categories; groups, centres and clinics are on the Mid-size tab."] },
    { type: "h4", inline: ["Why it works"] },
    {
      type: "list",
      ordered: false,
      items: [
        ["Every visit starts with a booking, and most practices still take them by phone."],
        ["Patients search by condition and treatment, and few practices have a page for either."],
        ["Practices pay monthly for things that keep them safe: forms, hosting, content reviews. That is the care plan, with a reason."],
      ],
    },
    { type: "h4", inline: ["Compliance is part of the job, and part of the price"] },
    {
      type: "table",
      head: [["Country"], ["Check before you build"], ["What you sell"]],
      rows: [
        [{ kind: "name", inline: ["USA"] }, { inline: ["Forms that collect health information fall under HIPAA: use a host and form service that signs a business associate agreement, or keep forms to contact details."] }, { inline: ["Privacy-safe booking and intake forms, a consent and photo policy page set, an accessibility review"] }],
        [{ kind: "name", inline: ["Canada"] }, { inline: ["Provincial health-privacy laws (PHIPA in Ontario, for example) and federal privacy law. Provincial colleges set advertising rules, including testimonials."] }, { inline: ["The same, plus a French version in Quebec"] }],
        [{ kind: "name", inline: ["UAE"] }, { inline: ["Medical advertising, including the website, needs approval from the emirate's health authority (DHA, DOH or MOHAP). Health data is expected to stay in the UAE."] }, { inline: ["An approval-ready content pack, local hosting, a bilingual site"] }],
      ],
    },
    { type: "p", variant: "fine", inline: ["These are prompts to check, not legal advice. The practice's own adviser signs off; you build what they approve."] },
    { type: "h4", inline: ["The demo rules, stricter than usual"] },
    {
      type: "list",
      ordered: false,
      items: [
        ["No patient photos, testimonials or before-and-after images, ever, without written consent on file. In the demo, every one is a marked placeholder."],
        ["No outcome claims, success rates or guarantees. Treatment pages say what the treatment is and who it is for."],
        ["Credentials, registration and licence numbers come from the practice. Leave bracketed placeholders."],
      ],
    },
  ],
};

const markets: Section = {
  id: "markets",
  num: "14",
  title: "Canada and the UAE",
  sub: "Pick the country first in the Kit Console. The categories, the regions, the prices and the notes in the kit follow it.",
  blocks: [
    {
      type: "steps",
      items: [
        { n: "01", inline: ["The country picker is at the top of the Kit Console, the lead finder and the Board. It starts on the USA."] },
        { n: "02", inline: ["Categories that don't exist in the country are hidden (no snow removal in Dubai), and a ", { strong: ["Strong in"] }, " badge marks the ones that sell especially well there."] },
        { n: "03", inline: ["Regions are provinces in Canada and emirates in the UAE, with their main cities and districts."] },
        { n: "04", inline: ["Kit prices are converted from the US-dollar planning figures at the rates an admin sets in Settings, and rounded."] },
      ],
    },
    { type: "h4", inline: ["Canada"] },
    {
      type: "list",
      ordered: false,
      items: [
        ["Cold email and texts fall under the anti-spam law (CASL): message only an address the business publishes, keep it about their business, and include your address and an unsubscribe."],
        ["Use the provincial business registry in place of the Secretary of State search, and the provincial regulator for licensed trades."],
        ["A public-facing site in Quebec needs French; price it as its own line."],
      ],
    },
    { type: "h4", inline: ["UAE"] },
    {
      type: "list",
      ordered: false,
      items: [
        ["Most owners run the business on WhatsApp. Expect the first reply there, and put a WhatsApp button next to the call button on every demo."],
        ["Check the trade name and licensed activity with the emirate's economic department, or the free-zone authority."],
        ["Marketing calls and messages are regulated: business hours, stop at the first request, and check the current rules before a calling block."],
        ["The Kit Console asks for the prospect site's language: English, Arabic (right to left) or both. The build prompt changes to match; Arabic copy comes from a fluent writer, never a machine translation."],
      ],
    },
  ],
};


// Section 15: IT Prospects, from The Outreach Reset (docs/source/outreach-reset.html, run 3 Oct 2026). Every number is the
// Reset's, with its source; E is evidence, P a practitioner view.
const L = (href: string, text: string): Inline => ({ link: { href, children: [text] } });

const itbuyers: Section = {
  id: "itbuyers",
  num: "15",
  title: "Finding IT buyers",
  sub: "IT Prospects is a separate area for companies that already pay for development: agencies with more work than developers, companies hiring developers, and growing firms with an operations problem.",
  blocks: [
    { type: "p", inline: ["The Outreach Reset found the first round's buyer was wrong for software work, and moved the target to people who already buy it. In Clutch's survey of US small businesses, 45% use only internal teams and 13% only external partners (E, Clutch survey, Dec 2025, as cited in the Reset). Buyers who already pay for development are the ones to reach first."] },
    {
      type: "table",
      head: [["Who"], ["How you find them"], ["What you offer first"]],
      rows: [
        [{ kind: "name", inline: ["Digital and web agencies"] }, { inline: ["The IT finder on Google Maps, and their own hiring or launch posts"] }, { inline: ["One paid test ticket, fixed price, under their brand; NDA first and they own the code"] }],
        [{ kind: "name", inline: ["Companies with an open developer role"] }, { inline: ["Job posts: paste them into the signals inbox"] }, { inline: ["A 2-week trial developer, or one backlog feature at a fixed price"] }],
        [{ kind: "name", inline: ["Growing businesses with an IT need"] }, { inline: ["Posts for IT support, data entry or an ops admin; agency partners"] }, { inline: ["A workflow audit or discovery sprint, then a fixed-price build"] }],
      ],
    },
    { type: "h4", inline: ["A signal is your reason to write"] },
    {
      type: "list",
      ordered: false,
      items: [
        ["Open the ", { strong: ["Search strings"] }, " page, run a search in your own browser, and read the posts. LinkedIn, Indeed, Upwork, Wellfound, Clutch and Reddit don't allow automated collection, so the app never fetches them."],
        ["Paste a good post into the ", { strong: ["Signals inbox"] }, ". It reads the company, the date and the kind of signal; you check every field before saving."],
        ["A signal goes stale: a project post after 14 days, a tender after 30, a job post after 60. Check a stale one is still open before you write."],
        ["Write to the hiring manager or the founder, not the recruiter."],
      ],
    },
    { type: "h4", inline: ["The first message"] },
    {
      type: "list",
      ordered: false,
      items: [
        ["Under 90 words, one true trigger, one proof point, one easy question. No price, no link and no attachment in the first email."],
        ["Pitching in a cold email cuts replies by up to 57% (P, ", L("https://www.gong.io/blog/does-cold-email-even-work-any-more-heres-what-the-data-says/", "Gong"), "). 58% of replies come from the first email (P, ", L("https://instantly.ai/cold-email-benchmark-report-2026", "Instantly"), ")."],
        ["State your overlap hours with their time zone. Each extra hour of gap cuts live communication by about 11% (E, ", L("https://pubsonline.informs.org/doi/10.1287/orsc.2023.17558", "Organization Science"), ")."],
        ["Never claim to be US-local. Say where the team works and who their US point of contact is."],
      ],
    },
    { type: "note", tone: "warn", inline: ["The six qualifier questions and the category scores in the IT finder are judgement, not measured data. Judge a segment after about 300 delivered emails, not after the first 50."] },
  ],
};

export const EXTRA_SECTIONS: Section[] = [midsize, healthcare, markets, itbuyers];
