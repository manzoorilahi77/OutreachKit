// Ported from the original's build handler (docs/source/territory-desk.html). Pure: no DOM, no globals.
// Returns the kit as data; the console renders it and kit/text.ts flattens it for the golden tests.
import { AICROSS, AIUP, CROSS, FAM, OPPS, STATES, STYLE, TPL, TONE } from "@/data";
import type { Inline } from "@/content/types";
import { sectionPlan, buildPromptText } from "./buildPrompt";
import { findCategory } from "./categories";
import { archFor, gapMid, makeMaps, makeTags, marketSize, money, priceModel, rotation, runBlocks, slug, styleLine } from "./helpers";
import { messages } from "./messages";
import { openers } from "./openers";
import type { Cell, Kit, KitContext, KitInput, KitNode, KitSection } from "./types";

const s = (...inline: Inline[]): Inline[] => inline;
const strong = (...c: Inline[]): Inline => ({ strong: c });
const mono = (t: string): Inline => ({ mono: t });
const h4 = (...inline: Inline[]): KitNode => ({ k: "h4", inline });
const p = (tone: "prose" | "fine" | "muted", ...inline: Inline[]): KitNode => ({ k: "p", tone, inline });
const pad = (n: number) => String(n).padStart(2, "0");
const fee = (lo: number, hi: number, none: string) => (lo ? money(lo) + "–" + money(hi) : none);

export function buildContext(input: KitInput): KitContext {
  const c = findCategory(input.cat);
  if (!c) throw new Error(`Unknown category: ${input.cat}`);
  const stName = STATES[input.st][0];
  const [msLabel, msMult] = marketSize(input.st, input.city);
  const msShort = msLabel.split(" —")[0]!.toLowerCase();
  const fam = FAM[c.f];
  const pitch = fam.pitch.replace(/\[City\]/g, input.city);
  const P = priceModel(c, msMult >= 90 ? 1.15 : msMult >= 40 ? 1 : msMult >= 16 ? 0.85 : 0.8);
  const dom = (input.domain?.trim() || "yourstudio.com").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const demo = "https://" + dom + "/" + slug(input.city) + "/{business-name}";
  return {
    city: input.city, st: input.st, stName, cat: c.n, catL: c.n.toLowerCase(), tkt: c.tkt, q0: c.q[0]!, fam: c.f,
    arch: archFor(c), famPitch: pitch, famBp: fam.bp, tone: TONE[c.f] || TONE.out,
    nearby: rotation(input.st, input.city).slice(0, 4).join(", "),
    price: P, pricedBecause: "it's a five-to-seven page build with three city pages, in a " + msShort,
    demo, you: input.you?.trim() || "{Your Name}", brand: input.brand?.trim() || "{Your Studio}",
    demoPattern: "https://" + dom + "/<city-slug>/<business-slug> — e.g. " + demo.replace("{business-name}", "acme-" + c.t[0]),
  };
}

export function generateKit(input: KitInput): Kit {
  const c = findCategory(input.cat)!;
  const { city, st } = input;
  const X = buildContext(input);
  const stName = X.stName;
  const mobileFirst = input.device === "mobile";
  const [msLabel, msMult] = marketSize(st, city);
  const msShort = msLabel.split(" —")[0]!.toLowerCase();
  const pool = Math.round((c.d[3]! * msMult) / 10) * 10;
  const noSite = Math.round((pool * gapMid(c.gap)) / 10) * 10;
  const fam = FAM[c.f];
  const srcOrder = mobileFirst
    ? fam.src
    : fam.src.slice().sort((a, b) => {
        const m = (x: string) => (/instagram|facebook|nextdoor|pinterest/i.test(x) ? 1 : 0);
        return m(a) - m(b);
      });
  const P = X.price;
  const A = X.arch;
  const yr1 = P.rec + 12 * P.careRec;
  const yr1b = yr1 + 9 * 300;
  const device = mobileFirst ? "phone" : "desktop";
  const sections: KitSection[] = [];
  const sec = (id: string, ...nodes: KitNode[]) => sections.push({ id, nodes });

  sec("snapshot",
    h4("Snapshot"),
    { k: "pairs", items: [
      { dt: "Their typical job", dd: s(c.tkt) },
      { dt: "Your build price", dd: s(c.price) },
      { dt: "Est. share with no real site", dd: s(c.gap) },
      { dt: "Est. operators in market", dd: s("~" + pool) },
      { dt: "Est. no-site prospects", dd: s("~" + noSite) },
      { dt: "Weeks of daily blocks", dd: s("~" + Math.max(1, Math.round(noSite / 50))) },
    ] },
    p("muted", "Market counts are modelled from the category density factor and the city's rank within " + stName + ", not from a live business count. Verify against your first Maps sweep and replace them."));

  sec("maps",
    h4("Google Maps — run these on desktop"),
    { k: "chips", items: makeMaps(c, st, city) },
    p("muted", "Then swap the city for each town in the rotation pool below. Filter the results for listings with no Website button — that is your list."));

  sec("instagram",
    h4("Instagram — hashtags, phone app, Recent tab"),
    { k: "chips", items: makeTags(c, st, city) },
    p("muted", "These are constructed from standard city-plus-service patterns, so the tags almost certainly exist but the post volume in " + city + " is unverified. On your first pass, check each one and cross out anything under roughly 200 posts."),
    h4("Location tag & rotation pool"),
    { k: "chips", items: [city + ", " + stName].concat(rotation(st, city)) },
    p("muted", "Rotate through the ones inside your drive radius. Cities are listed by size within the state, so the later entries are the smaller, less-worked markets."));

  const where: { n: string; inline: Inline[] }[] = srcOrder.map((x, i) => ({ n: pad(i + 1), inline: s(x) }));
  if (c.lic)
    where.push({ n: pad(srcOrder.length + 1), inline: s(
      strong(stName + " licence registry."), " This category is licensed in most states. Search ", mono(stName + " contractor license lookup"),
      " — the registry gives you the legal owner name, licence date and often a phone number, and it is the cleanest prospect list you will ever get.") });
  where.push({ n: pad(srcOrder.length + (c.lic ? 2 : 1)), inline: s(
    strong(stName + " Secretary of State business search."),
    " Confirms the owner's legal name and registration date. Businesses registered in the last 24 months are the single best segment: real, active, and almost never online yet.") });
  sec("sources", h4("Where to look, in order for a " + device + "-primary block"), { k: "steps", items: where });

  sec("seeds",
    h4("Three seed accounts that lead to more"),
    { k: "list", items: [
      s(strong("Local supply houses."), " The suppliers this category buys from. Their followers are almost entirely operators."),
      s(strong("The one polished competitor in " + city + "."), " The outfit with 20k followers and a real website. The \"Suggested for you\" carousel on their profile is full of smaller lookalikes."),
      s(strong("Adjacent trades and referrers."), " The businesses that tag who they subcontract or recommend. Those tagged accounts are usually one-truck operations."),
    ] });

  sec("site",
    h4("The site this category actually needs — " + A.l),
    p("prose", A.goal),
    { k: "pairs", items: [
      { dt: "Conversion model", dd: s(A.l) },
      { dt: "Primary CTA", dd: s(A.cta[0]!) },
      { dt: "Secondary CTA", dd: s(A.cta[1]!) },
      { dt: "Routes", dd: s(String(A.routes.length)) },
    ] },
    h4("Page structure — in this order"),
    { k: "steps", items: A.sec.map((x, i) => ({ n: pad(i + 1), inline: s(x) })) },
    h4("Plus, specific to " + c.n.toLowerCase()),
    { k: "steps", items: fam.bp.map((b, i) => ({ n: "+" + (i + 1), inline: s(b) })) },
    h4("Routes"),
    { k: "chips", items: A.routes.map((r) => r.split(" —")[0]!) },
    h4("Form fields — exactly these, nothing more"),
    { k: "chips", items: A.form },
    h4("What this site must never claim"),
    { k: "list", items: A.con.map((x) => s(x)) },
    { k: "pairs", items: [
      { dt: "Design register", dd: s(A.reg), small: true },
      { dt: "Structured data", dd: s(A.schema), small: true },
    ] },
    p("fine", "Section 07 describes the general principle. This is the version for " + c.n.toLowerCase() + " specifically — different sections, different routes, different form, different legal exposure. The build prompt below is generated from exactly this."));

  const pl = sectionPlan(A);
  const S = STYLE[c.f] || STYLE.out;
  sec("template",
    h4("Against your base-website template"),
    p("fine", "The prompt starts from ", { link: { href: TPL.repo, children: ["manzoorilahi77/base-website"] } },
      " rather than an empty directory, so every demo reuses the theme system, the SEO layer, the contact-form delivery hook and the ", mono("/demo-shots"),
      " route. For this category that means:"),
    { k: "pairs", items: [
      { dt: "Theme to set", dd: s(mono("themeId: '" + S[0] + "'"), " — " + S[1]) },
      { dt: "Sections reused", dd: s(pl.reuse.length + " of " + A.sec.length) },
      { dt: "New components", dd: s(String(pl.build.length)) },
      { dt: "Routes to add", dd: s(String(A.routes.length)) },
    ] },
    h4("Reuse — adapt, do not rebuild"),
    { k: "steps", items: pl.reuse.map((r) => ({ n: r[0], inline: s(strong(r[1]), " ← template “" + r[2] + "”") })) },
    h4("Build new in src/components/sections/"),
    { k: "steps", items: pl.build.length
        ? pl.build.map((r) => ({ n: r[0], inline: s(strong(r[1])) }))
        : [{ n: "—", inline: s("Nothing new. The template covers this archetype as it stands.") }] },
    p("fine", "Step 1 of the prompt is always the same: create from the template, ", mono("pnpm install"), ", read ", mono("CLAUDE.md"), ", fill ",
      mono("site.config.ts"), " including the eleven ", mono("{{TOKEN}}"), " placeholders, then confirm ", mono("/style-guide"), " before a single component is touched."));

  sec("prompt",
    h4("The build prompt — Next.js 15 + React 19 + Tailwind v4"),
    p("fine", "Written to the prompt-coach coding template: ", strong("Goal"), " (intended behaviour, not a symptom), ", strong("Context"),
      " (stack and versions), ", strong("Constraints"), " (what must never happen), ", strong("Done when"), " (checkable acceptance criteria), ",
      strong("Size"), " (four reviewable steps instead of one unreviewable diff), plus ", strong("Style"), " and ", strong("Artifacts"),
      ", which are the two chunks people always skip on a UI task. The style line carries real hex roles and named fonts — " + styleLine(c.f).split(";")[0] +
      " — chosen for this trade, so the model has a target instead of the word \"modern\"."),
    { k: "copyBlock", label: "Sample-site build prompt · " + X.cat + " · " + city + ", " + st, text: buildPromptText(X) },
    p("fine", "Fill the business block at the top before you run it. The constraints section is what stops the model inventing reviews and licence numbers — the one thing that will lose you the deal and could get you in real trouble. Because content lives in typed files under ",
      mono("/content"), ", the first build takes an evening and every demo after it is a ten-minute swap of one object. The ", mono("/demo-shots"),
      " route exists so you can screenshot the hero at phone width without a device."));

  sec("openers",
    h4("Fifteen opening lines — angle, hook and sample link"),
    p("fine", "Each one is a different ", strong("angle"), ". The ", strong("hook"),
      " is what you must find on their profile first — it is the proof you are a person who looked, and nothing sends without it. The ",
      strong("link line"), " carries your sample site. Copy takes the line and the link together."),
    { k: "openers", items: openers(X) },
    p("fine", "Sample-site URL pattern for this territory: ", mono(X.demoPattern),
      " — one folder per city, one page per business, so you can run fifty demos off one domain and take any of them down in seconds."));

  sec("sequence",
    h4("The outreach sequence — copy, fill the braces, send"),
    p("fine", "Braced placeholders are the only things left to fill: {Owner}, {Business Name}, {specific recent job}, {Your Phone}, and {business-name} inside the URL. Your name and the sample link are already in there. Everything else is written for a " + X.catL + " company in " + city + "."),
    ...messages(X).map((m): KitNode => ({ k: "copyBlock", label: m[0], text: m[1] })),
    p("fine", "Send DMs from your phone — desktop messages read as automated and get throttled harder. Cold email needs your real physical address and a working opt-out. Do not cold-text: most of these numbers are mobiles, and TCPA penalties are per message."));

  const cell = (kind: Cell["kind"], ...inline: Inline[]): Cell => ({ kind, inline });
  sec("pricing",
    h4("What to charge — " + c.n + " in a " + msShort),
    { k: "table", head: ["Tier", "Min", "Max", "When you use it"], minWidth: 560, rows: [
      [cell("name", "Spec demo"), cell("n", "$0"), cell("n", "$0"), cell("pitch", "Before you ever make contact. Free, always, and it stays yours until they pay.")],
      [cell("name", "Proof deal — first two clients only"), cell("n", money(P.proofLo)), cell("n", money(P.proofHi)), cell("pitch", "In exchange for a filmed testimonial, job photos and permission to name them. Discount the build, never the care plan.")],
      [cell("name", "Starter — 3 pages"), cell("n", money(P.starterLo)), cell("n", money(P.starterHi)), cell("pitch", "They genuinely have no budget, or you want the logo and photo work that comes after.")],
      [cell("name", "Standard — 5–7 pages + 3 city pages"), cell("n", money(P.min)), cell("n", money(P.max)), cell("pitch", "Your default. Quote ", strong(money(P.rec)), " unless something tells you otherwise.")],
      [cell("name", "Premium — 10+ pages, booking, photo day"), cell("n", money(P.premLo)), cell("n", money(P.premHi)), cell("pitch", "Their jobs run " + c.tkt + ". One job pays for it and you should say so.")],
      [cell("name", "Care plan (monthly)"), cell("n", money(P.careMin) + " / mo"), cell("n", money(P.careMax) + " / mo"), cell("pitch", "Every build, same contract, same day. Quote ", strong(money(P.careRec)), ".")],
    ] },
    { k: "list", items: [
      s(strong("The anchor rule."), " In a Tier A category the build should never cost more than one of their typical jobs. Theirs run " + c.tkt + ", so " + money(P.rec) + " is an easy sentence to say out loud."),
      s(strong("50% deposit"), " before you start, balance on launch. No deposit, no build — this single rule removes almost every bad client."),
      s(strong("Rush fee +25%"), " for anything under two weeks. They will pay it, and it protects your other clients."),
      s(strong("Never discount the recurring."), " Cut the build price all day; the care plan holds at " + money(P.careRec) + " or you have taught them everything is negotiable."),
      s(strong("Market adjustment applied."), " These figures are already scaled for a " + msShort + ". Same build in a major metro carries roughly 15% more; in a small town, 15–20% less."),
      s(strong("What one client is worth."), " Build " + money(P.rec) + " plus twelve months of care at " + money(P.careRec) + " is ", strong(money(yr1)),
        " in year one. Attach Google profile management at day 30 and it is about ", strong(money(yr1b)), "."),
    ] });

  sec("upsells",
    h4("What else you sell — specific to " + c.n.toLowerCase()),
    { k: "ups", items: fam.up.map((u) => ({ name: u[0]!, price: u[1]!, why: u[2]! })) },
    p("muted", strong("Seasonality:"), " " + fam.season));

  const crossRows = (rows: typeof CROSS): Cell[][] =>
    rows.map((o) => [cell("name", o[0]), cell("small", o[1]), cell("n", fee(o[2], o[3], "Your normal rate")), cell("pitch", o[4]), cell("small", o[5])]);
  const upRows = (rows: typeof OPPS): Cell[][] =>
    rows.map((o) => [cell("name", o[0]), cell("n", fee(o[1], o[2], "—")), cell("n", fee(o[3], o[4], "—")), cell("pitch", o[5]), cell("small", o[6])]);

  sec("cross",
    h4("Cross-sell — new revenue reached ", { em: ["through"] }, " this client"),
    p("fine", "Upsell is more money from the same buyer. Cross-sell is a different buyer you can only reach because this client trusts you. The second one is how a one-client month becomes a four-client month without any extra prospecting."),
    { k: "table", head: ["Route", "Who pays", "Your fee", "The line you say", "Why it works"], minWidth: 820, rows: crossRows(CROSS) },
    p("fine", "Two rules. Ask for the introduction ", strong("after"), " you have delivered something, never during the sale. And when a vendor pays you a referral fee, say so to the client every single time — an undisclosed commission is the one thing that ends a local reputation."));

  sec("aiup",
    h4("Software & AI — " + AIUP.length + " products to sell the same client"),
    p("fine", "Do not lead with any of this. The site is the trust purchase; software is what you sell in month three once they have seen you deliver. Sell only what you can still support in eighteen months — an AI that confidently quotes a price they do not charge is a liability with their name on it, not a feature."),
    { k: "table", head: ["Product", "Build", "Monthly", "The line you say", "When & what it takes"], minWidth: 840, rows: upRows(AIUP) },
    p("fine", "Attach the AI maintenance retainer to every single one. Models change, their prices change, their services change — without a retainer the thing drifts into being confidently wrong and you get the blame six months after you were last paid."));

  sec("aicross",
    h4("Software & AI cross-sell — " + AICROSS.length + " routes to a bigger buyer"),
    p("fine", "This is where the money stops scaling with your hours. Building one tool for one " + c.n.toLowerCase() + " company teaches you a workflow that several hundred operators in the same trade share — and the client who taught it to you paid for the build."),
    { k: "table", head: ["Route", "Who pays", "Your fee", "The line you say", "Why it works"], minWidth: 840, rows: crossRows(AICROSS) },
    p("fine", "Ownership matters here. If you productise work a client paid for, agree in writing up front who owns what — the usual clean split is they own their data and their brand, you own the code and the platform. Sort it before the build, never after it works."));

  sec("ladder",
    h4("The upsell ladder — " + OPPS.length + " products, with the line you actually say"),
    { k: "table", head: ["Product", "One-time", "Monthly", "The line you say", "When"], minWidth: 760, rows: upRows(OPPS) },
    p("fine", "Sell in order: build → care plan (same day) → Google profile and reviews at day 30 → ads or SEO at day 90 once the site has data to point at. Pitching a four-figure monthly retainer to someone who has never spent a dollar on marketing is how you lose an easy " + money(P.rec) + " build."));

  sec("block",
    h4("Your 60-minute block — " + device + "-primary"),
    { k: "timeline", items: runBlocks(mobileFirst) },
    p("muted", "Five blocks a week is roughly 50 qualified leads. At the funnel ratios in section 09 that is two to three closes a month."));

  return {
    input,
    header: {
      title: c.n + " — " + city + ", " + st,
      chips: [
        { text: "Tier " + c.tier, tone: c.tier.toLowerCase() as "a" | "b" | "c" },
        { text: "Score " + c.idx + "/100" },
        { text: fam.l },
        { text: msLabel },
        { text: mobileFirst ? "Phone-primary" : "Desktop-primary", tone: "hot" },
      ],
      note: c.note,
    },
    sections,
  };
}
