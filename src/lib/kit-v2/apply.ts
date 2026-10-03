// applyCategoryKit: lays a category kit over the ported kit. Pure. Keeps every explanatory paragraph of the
// original and replaces only the data; with no category kit it returns the ported kit untouched.
import type { Inline } from "@/content/types";
import { STYLE } from "@/data";
import { findCategory } from "@/lib/kit/categories";
import { marketSize, money, priceMult, styleLine } from "@/lib/kit/helpers";
import { messages } from "@/lib/kit/messages";
import type { Cell, DirectionCard, Kit, KitContext, KitNode, KitSection, LadderRung, Opener } from "@/lib/kit/types";
import { contentChip } from "./load";
import { buildPromptTextV2 } from "./prompt";
import { DIRECTION_IDS, LETTER, modeLabel, resolveDirection, siteTypeLabel, tierLabel } from "./themes";
import type { CategoryKit, DirectionId, RouteItem, Unit } from "./types";

const strong = (...c: Inline[]): Inline => ({ strong: c });
const mono = (t: string): Inline => ({ mono: t });
const cell = (kind: Cell["kind"], ...inline: Inline[]): Cell => ({ kind, inline });

const UNIT_SUFFIX: Record<Unit, string> = {
  "one-time": "", monthly: " / mo", "per-job": " / job", "per-year": " / yr", "per-shoot": " / shoot", "per-page": " / page", "per-hour": " / hr",
};

/** Rows marked scalesWithMarket (or unflagged one-time, per-job and per-shoot rows) move with the market, rounded to 50. */
export function scaledRange(min: number, max: number, unit: Unit, scalesWithMarket: boolean | undefined, mult: number): [number, number] {
  const scales = scalesWithMarket ?? (unit === "one-time" || unit === "per-job" || unit === "per-shoot");
  if (!scales || mult === 1) return [min, max];
  const r = (v: number) => Math.round((v * mult) / 50) * 50;
  return [r(min), r(max)];
}

export function priceText(min: number, max: number, unit: Unit, none = "—"): string {
  if (!min && !max) return none;
  return (min === max ? money(min) : money(min) + "–" + money(max)) + UNIT_SUFFIX[unit];
}

/** Fills the placeholders the engine owns. {Owner}, {Business Name}, {specific recent job}, {Your Phone} stay visible. */
export function fillCopy(t: string, X: KitContext): string {
  const P = X.price;
  return t
    .replaceAll("{demo-link}", X.demo)
    .replaceAll("{City}", X.city)
    .replaceAll("{Your Name}", X.you)
    .replaceAll("{Your Studio}", X.brand)
    .replaceAll("{Build Range}", money(P.min) + "–" + money(P.max))
    .replaceAll("{Build Price}", money(P.rec))
    .replaceAll("{Care Range}", money(P.careMin) + "–" + money(P.careMax));
}

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (m) => m.toUpperCase());

export function directionCards(ck: CategoryKit, X: KitContext): DirectionCard[] {
  const c = findCategory(X.cat)!;
  return DIRECTION_IDS.map((id) => {
    const R = resolveDirection(ck, id);
    const d = R.direction;
    return {
      id, letter: LETTER[id], name: d.name, siteType: siteTypeLabel(d.siteType), tier: tierLabel(d.pairsWithTier),
      heroLayout: d.heroLayout, mood: d.mood, bestFor: d.bestFor, whyItFits: d.whyItFits,
      headline: d.headlineSample.replaceAll("{City}", X.city),
      themeId: R.theme.id, themeName: R.theme.name, mode: R.theme.mode, colors: R.colors, onAccent: R.onAccent, mutedText: R.mutedText,
      type: R.type,
      preview: {
        business: "{Business Name}",
        ctas: [X.arch.cta[0]!, X.arch.cta[1]!],
        services: c.q.slice(0, 3).map(titleCase),
        trust: ["[Licence — confirm]", "[Google rating]", "[Years in business]"],
      },
    };
  });
}

export function applyCategoryKit(kit: Kit, X: KitContext, ck: CategoryKit | null, dir: DirectionId = "b"): Kit {
  if (!ck) return kit;
  const c = findCategory(X.cat)!;
  const mult = priceMult(marketSize(X.st as never, X.city)[1]);
  const R = resolveDirection(ck, dir);
  const fill = (t: string) => fillCopy(t, X);
  const fee = (min: number, max: number, unit: Unit, flag?: boolean, none = "—") => {
    const [lo, hi] = scaledRange(min, max, unit, flag, mult);
    return priceText(lo, hi, unit, none);
  };
  const routeRows = (rows: RouteItem[]): Cell[][] =>
    rows.map((o) => [cell("name", o.route), cell("small", o.whoPays), cell("n", fee(o.min, o.max, o.unit, undefined, "Your normal rate")), cell("pitch", fill(o.pitchLine)), cell("small", o.whyItWorks)]);
  const routeHead = ["Route", "Who pays", "Your fee", "The line you say", "Why it works"];

  const sections: KitSection[] = [];
  for (const s of kit.sections) {
    const nodes = s.nodes.slice();
    switch (s.id) {
      case "site": {
        const i = nodes.findIndex((n) => n.k === "h4" && typeof n.inline[0] === "string" && n.inline[0].startsWith("Plus, specific to"));
        nodes.splice(i + 2, 0,
          { k: "h4", inline: ["Plus, for " + c.n.toLowerCase()] },
          { k: "steps", items: ck.pageStructurePlus.map((p, j) => ({ n: "★" + (j + 1), inline: [strong(p.section), " — " + p.contains + ". ", { em: [p.why] }] })) });
        break;
      }
      case "template": {
        const pairs = nodes.find((n) => n.k === "pairs");
        if (pairs && pairs.k === "pairs")
          pairs.items = pairs.items.map((it) => it.dt === "Theme to set"
            ? { ...it, dd: [mono("themeId: '" + R.theme.id + "'"), " — " + R.theme.name + " · Direction " + LETTER[dir] + ", " + R.direction.name] }
            : it);
        break;
      }
      case "prompt": {
        sections.push({ id: "directions", nodes: [
          { k: "h4", inline: ["Design directions — choose one before you build"] },
          { k: "p", tone: "fine", inline: ["Three different kinds of site for a " + X.catL + " company, each drawn in a combo from your base-website template's theme library. The one you choose sets the theme, the hero and the mood in the build prompt below. Every photo slot is a marked placeholder until the owner gives written permission."] },
          { k: "directions", items: directionCards(ck, X), selected: dir },
        ] });
        const famStyle = styleLine(c.f).split(";")[0]!;
        const T = R.theme;
        const dirStyle = T.name + " (" + T.id + "), " + modeLabel(T) + " — bg " + T.bg + ", surface " + T.surface + ", text " + T.text + ", muted " + T.muted + ", accent " + T.accent + ", positive " + T.positive + ", negative " + T.negative;
        for (let j = 0; j < nodes.length; j++) {
          const n = nodes[j]!;
          if (n.k === "p") nodes[j] = { ...n, inline: n.inline.map((x) => (typeof x === "string" ? x.replace(famStyle, dirStyle) : x)) };
          if (n.k === "copyBlock") nodes[j] = { ...n, label: n.label + " · Direction " + LETTER[dir] + " " + R.direction.name, text: buildPromptTextV2(X, ck, dir) };
        }
        break;
      }
      case "openers": {
        const j = nodes.findIndex((n) => n.k === "openers");
        nodes[j] = { k: "openers", items: ck.openers.map((o): Opener => [o.angle, fill(o.line), o.hook, fill(o.linkLine)]) };
        break;
      }
      case "sequence": {
        const q = ck.sequence;
        const bodies = [
          q.dm1, q.dm2, q.call,
          q.objections.map((o) => o.objection + "\n→ " + o.handler).join("\n\n"),
          "Subject: " + q.email.subject + "\n\n" + q.email.body,
          q.voicemail, q.takedown, q.nurture,
        ];
        const labels = messages(X).map((m) => m[0]);
        let k = 0;
        for (let j = 0; j < nodes.length; j++) {
          const n = nodes[j]!;
          if (n.k !== "copyBlock") continue;
          const block: KitNode = { k: "copyBlock", label: labels[k]!, text: fill(bodies[k]!) };
          if (k === 3) block.pairs = q.objections.map((o) => ({ term: fill(o.objection), def: fill(o.handler) }));
          nodes[j] = block;
          k++;
        }
        break;
      }
      case "pricing": {
        const j = nodes.findIndex((n) => n.k === "table");
        const t = nodes[j]!;
        if (t.k === "table")
          nodes[j] = {
            ...t,
            head: ["Tier / item", "Min", "Max", "What moves it"],
            rows: [
              ...t.rows,
              ...ck.pricing.lineItems.map((li) => {
                const [lo, hi] = scaledRange(li.min, li.max, li.unit, li.scalesWithMarket, mult);
                return [cell("name", li.item), cell("n", money(lo) + UNIT_SUFFIX[li.unit]), cell("n", money(hi) + UNIT_SUFFIX[li.unit]), cell("pitch", li.description)];
              }),
            ],
          };
        const l = nodes.findIndex((n) => n.k === "list");
        const list = nodes[l]!;
        if (list.k === "list") nodes[l] = { k: "list", items: [...ck.pricing.bullets.map((b): Inline[] => [b]), ...list.items] };
        break;
      }
      case "upsells": {
        const j = nodes.findIndex((n) => n.k === "ups");
        nodes[j] = { k: "ups", items: ck.whatElseYouSell.map((u) => ({ name: u.name, price: fee(u.min, u.max, u.unit, u.scalesWithMarket), why: fill(u.pitchLine) + " When: " + u.when })) };
        break;
      }
      case "cross": {
        const j = nodes.findIndex((n) => n.k === "table");
        nodes[j] = { k: "tabs", tabs: [
          { label: "Without AI", table: { head: routeHead, minWidth: 820, rows: routeRows(ck.crossSell.withoutAI) } },
          { label: "With AI", table: { head: routeHead, minWidth: 820, rows: routeRows(ck.crossSell.withAI) } },
        ] };
        break;
      }
      case "aiup": {
        nodes[0] = { k: "h4", inline: ["Software & AI — " + ck.softwareAI.length + " products to sell the same client"] };
        const j = nodes.findIndex((n) => n.k === "table");
        const t = nodes[j]!;
        const KIND = { software: "Software", ai: "AI", automation: "Automation" } as const;
        if (t.k === "table")
          nodes[j] = { ...t, rows: ck.softwareAI.map((o) => [
            cell("name", { chip: { tone: "plain", text: KIND[o.kind] } }, " ", o.name),
            cell("n", priceText(o.oneTimeMin, o.oneTimeMax, "one-time")),
            cell("n", priceText(o.monthlyMin, o.monthlyMax, "one-time")),
            cell("pitch", fill(o.pitchLine)),
            cell("small", o.whenAndWhatItTakes),
          ]) };
        break;
      }
      case "aicross": {
        nodes[0] = { k: "h4", inline: ["Software & AI cross-sell — " + ck.routesToBiggerBuyer.length + " routes to a bigger buyer"] };
        const j = nodes.findIndex((n) => n.k === "table");
        nodes[j] = { k: "table", head: routeHead, minWidth: 840, rows: routeRows(ck.routesToBiggerBuyer) };
        break;
      }
      case "ladder": {
        nodes[0] = { k: "h4", inline: ["The upsell ladder — " + ck.upsellLadder.length + " rungs, with the line you actually say"] };
        const j = nodes.findIndex((n) => n.k === "table");
        nodes[j] = { k: "ladder", rungs: ck.upsellLadder.map((r): LadderRung => ({
          rung: r.rung, day: r.day, offer: r.offer, price: fee(r.min, r.max, r.unit), trigger: r.trigger, line: fill(r.line),
        })) };
        break;
      }
    }
    sections.push({ id: s.id, nodes });
  }

  return {
    ...kit,
    header: { ...kit.header, chips: [...kit.header.chips, { text: contentChip(ck) }] },
    sections,
  };
}

/** The family's current combo, for "is this direction the family's own" checks. */
export const familyThemeId = (X: KitContext) => (STYLE[X.fam] || STYLE.out)[0];
