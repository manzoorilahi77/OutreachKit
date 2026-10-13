// applyMarket: the last layer over a kit. Pure. It runs after applyCategoryKit and adds what depends on the
// catalogue and the country, never on the port: the family the category is listed under, its size, the country,
// prices in the local currency, country notes, healthcare checks, and (UAE only) the prospect site's language and
// direction in the build prompt. For a US small-business category from the port it changes nothing but the chips.
import { FAM } from "@/data";
import { findCategory, groupLabel } from "@/lib/kit/categories";
import { SIZE_LABEL } from "@/lib/kit/extBoard";
import type { Kit, KitContext, KitNode, KitSection } from "@/lib/kit/types";
import { CURRENCY_OF, convertMoneyText, DEFAULT_RATES, rateFor, type Rates } from "./currency";
import { COUNTRY_NOTES, HEALTH_NOTES, LANG_LABEL, MID_NOTE, langBlock, type SiteLang } from "./notes";
import { COUNTRIES, countryOf, placeLabel, regionName, type RegionCode } from "./regions";

export interface MarketOptions {
  rates?: Rates;
  /** UAE only: the prospect site's language. Ignored elsewhere. */
  lang?: SiteLang;
}

/** Maps every string in a value, leaving link targets alone. */
function mapStrings<T>(v: T, fn: (s: string) => string): T {
  if (typeof v === "string") return fn(v) as T;
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, fn)) as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = k === "href" ? x : mapStrings(x, fn);
    return out as T;
  }
  return v;
}

const insertAfter = (nodes: KitNode[], at: number, ...add: KitNode[]) => [...nodes.slice(0, at + 1), ...add, ...nodes.slice(at + 1)];

export function applyMarket(kit: Kit, X: KitContext, opts: MarketOptions = {}): Kit {
  const c = findCategory(X.cat);
  if (!c) return kit;
  const st = X.st as RegionCode;
  const country = countryOf(st);
  const currency = CURRENCY_OF[country];
  const rates = opts.rates ?? DEFAULT_RATES;
  const lang: SiteLang | null = country === "AE" ? (opts.lang ?? "en") : null;
  const health = c.group === "health";

  // Header: the family it's listed under, its size, and the country.
  const famLabel = FAM[c.f].l;
  const chips = kit.header.chips.map((ch) => (ch.text === famLabel ? { ...ch, text: groupLabel(c.group) } : ch));
  chips.push({ text: SIZE_LABEL[c.size] });
  if (country !== "US") chips.push({ text: COUNTRIES[country].short + " · " + currency });
  if (lang) chips.push({ text: "Site: " + LANG_LABEL[lang] });
  const title = country === "AE" ? c.n + " — " + placeLabel(st, X.city) : kit.header.title;

  const sections: KitSection[] = kit.sections.map((s) => {
    let nodes = s.nodes.slice();
    switch (s.id) {
      case "snapshot":
        if (c.size === "mid") nodes.push({ k: "p", tone: "muted", inline: [MID_NOTE] });
        break;
      case "maps":
        if (country === "AE") {
          const i = nodes.findIndex((n) => n.k === "chips");
          if (i >= 0) nodes[i] = { k: "chips", items: c.q.map((q) => q + " near " + placeLabel(st, X.city)) };
        }
        break;
      case "sources":
        if (country !== "US") {
          const N = COUNTRY_NOTES[country];
          nodes.push({ k: "h4", inline: [N.title] }, { k: "list", items: N.items(regionName(st)).map((t) => [t]) });
        }
        break;
      case "site":
        if (health) {
          const H = HEALTH_NOTES[country];
          const i = nodes.findIndex((n) => n.k === "list");
          nodes = insertAfter(nodes, i >= 0 ? i : nodes.length - 1,
            { k: "h4", inline: ["Check before you build — healthcare"] },
            { k: "list", items: H.map((t) => [t]) },
            { k: "p", tone: "fine", inline: ["These are prompts to check, not legal advice: the practice's own adviser signs off. The work behind each one is a paid line item; the compliance items in the selling sections price it."] });
        }
        break;
      case "prompt":
        if (lang)
          nodes = nodes.map((n) => (n.k === "copyBlock" ? { ...n, label: n.label + " · " + LANG_LABEL[lang], text: withLanguage(n.text, lang) } : n));
        break;
      case "pricing":
        if (currency !== "USD")
          nodes.push({ k: "p", tone: "muted", inline: ["Prices are the US-dollar planning figures converted at 1 USD = " + rateFor(currency, rates) + " " + currency + " (set by an admin in Settings) and rounded. Check them against two or three local quotes before you say one out loud."] });
        break;
    }
    return { id: s.id, nodes };
  });

  const out: Kit = { ...kit, header: { ...kit.header, title, chips }, sections };
  if (currency === "USD") return out;
  return { ...out, header: mapStrings(out.header, (t) => convertMoneyText(t, currency, rates)), sections: mapStrings(out.sections, (t) => convertMoneyText(t, currency, rates)) };
}

/** The build prompt with the language and direction block placed before Technical requirements. */
export function withLanguage(prompt: string, lang: SiteLang): string {
  const block = langBlock(lang);
  const at = prompt.indexOf("\nTechnical requirements\n");
  return at < 0 ? prompt + "\n\n" + block : prompt.slice(0, at) + "\n" + block + "\n" + prompt.slice(at);
}
