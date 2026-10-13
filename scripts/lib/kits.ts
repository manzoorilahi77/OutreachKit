// The category-kit checker behind `pnpm kits:check` and tests/kits.test.ts.
// Validates every src/kits/*.json against the schema, then the content rules the schema can't express:
// identity, design directions, contrast, placeholders, the three corrections, money, invented evidence,
// brand names, the swap test, sibling repeats and the upsell ladder.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
import { STYLE } from "../../src/data";
import { ALL_CATS as CATS } from "../../src/lib/kit/categories";
import { ratio } from "../../src/lib/contrast";
import { kitSlug } from "../../src/lib/kit-v2/types";
import type { CategoryKit } from "../../src/lib/kit-v2/types";
import { THEMES } from "../../src/themes/library";
import type { ThemeId } from "../../src/themes/library";
import { pickReadable } from "../../src/themes/contrast";

export const KITS_DIR = "src/kits";
export const SCHEMA_PATH = "docs/prompts/field-kit-v2/category-kit.schema.json";
const DENY_PATH = "scripts/kits/deny-brands.txt";

export const PLACEHOLDERS = [
  "{Owner}", "{Business Name}", "{specific recent job}", "{Your Phone}", "{Neighborhood}",
  "{City}", "{Your Name}", "{Your Studio}", "{demo-link}", "{Your Physical Address}",
  "{Build Range}", "{Build Price}", "{Care Range}",
];
const MAX_GENERIC = 3;
const REPEAT_AT = 0.6;
const MONTHLY_CAP = 2500;
const ONE_TIME_CAP = 40000;
// Mid-size categories sell portals, integrations and multi-site builds, so their ceilings are higher.
const MID_MONTHLY_CAP = 8000;
const MID_ONE_TIME_CAP = 150000;

export interface Problem { file: string; rule: string; text: string }
export interface FileReport {
  file: string;
  slug: string;
  openers: number;
  products: number;
  routes: number;
  generic: string[];
  repeats: number;
  failed: boolean;
}
export interface CheckResult { problems: Problem[]; warnings: Problem[]; reports: FileReport[] }

// ---------- helpers ----------

type Ctor<T> = T | { default: T };
const unwrap = <T>(m: Ctor<T>): T => ((m as { default?: T }).default ?? m) as T;

// Enum and id fields: fixed vocabulary from the schema, not copy.
const ENUM_KEYS = new Set(["themeId", "id", "siteType", "heroLayout", "pairsWithTier", "unit", "kind"]);

/** Every string in the file with its JSON path, skipping identity, provenance and enum fields. */
function strings(v: unknown, path = "$", out: [string, string][] = []): [string, string][] {
  if (typeof v === "string") out.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${path}[${i}]`, out));
  else if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v)) {
      if (path === "$" && (k === "provenance" || k === "slug" || k === "category")) continue;
      if (ENUM_KEYS.has(k)) continue;
      strings(x, `${path}.${k}`, out);
    }
  return out;
}

const depluralise = (w: string) =>
  w.length > 4 && /(ses|xes|ches|shes)$/.test(w) ? w.slice(0, -2) : w.length > 3 && /[^s]s$/.test(w) ? w.slice(0, -1) : w;
const words = (t: string) => (t.toLowerCase().match(/[a-z][a-z'-]*/g) ?? []).map((w) => depluralise(w.replace(/'s$|'$/, "")));

// Words that belong to every trade, so they never count as "this category's own noun".
const GENERIC = new Set([
  "company", "service", "contractor", "installer", "installation", "install", "repair", "near", "business", "local",
  "builder", "and", "the", "for", "pro", "life",
]);
const STOP = new Set([
  ...GENERIC, "page", "site", "website", "section", "photo", "price", "pricing", "customer", "client", "owner", "people",
  "form", "quote", "call", "phone", "book", "booking", "online", "list", "button", "show", "each", "every", "what",
  "with", "their", "your", "they", "them", "from", "that", "this", "have", "when", "which", "where", "before",
  "after", "about", "real", "only", "other", "more", "most", "also", "into", "over", "just", "does", "done",
  "plus", "than", "then", "these", "those", "here", "there", "area", "city", "google", "review", "year", "month",
  "week", "day", "time", "work", "job", "team", "help", "need", "want", "make", "made", "take", "used", "use",
  "using", "like", "much", "many", "same", "first", "last", "next", "home", "homeowner", "contact", "request",
  "free", "plan", "how", "why", "who", "one", "two", "three", "four", "five", "six", "can", "will", "would",
  "could", "should", "not", "don't", "it's", "per", "a", "an", "of", "to", "in", "on", "or", "is", "are", "be",
  "so", "by", "at", "as", "it", "if", "do", "up", "out", "what's", "simple", "clear", "short", "full", "own",
  "decide", "decision", "answer", "question", "option", "detail", "include", "includes", "visitor", "link",
  "search", "trust", "proof", "costs", "cost", "budget", "value", "local", "nearby", "serve", "served",
]);

function categoryNouns(cat: (typeof CATS)[number]): { nouns: Set<string>; stems: string[] } {
  const nouns = new Set<string>();
  for (const src of [cat.n, ...cat.q])
    for (const w of words(src))
      if (w.length >= 3 && !GENERIC.has(w)) {
        nouns.add(w);
        // "painting" → "paint", "staining" → "stain": the trade's verb form is as specific as its noun.
        if (w.length > 6 && w.endsWith("ing")) nouns.add(w.slice(0, -3));
      }
  for (const t of cat.t) if (t.length >= 3 && !GENERIC.has(t)) nouns.add(depluralise(t));
  return { nouns, stems: cat.t.filter((t) => t.length >= 6).map(depluralise) };
}

function hasNoun(line: string, nouns: Set<string>, stems: string[]): boolean {
  const ws = words(line);
  if (ws.some((w) => [...nouns].some((n) => w === n || (n.length >= 4 && w.startsWith(n))))) return true;
  const squashed = line.toLowerCase().replace(/[^a-z]/g, "");
  return stems.some((s) => squashed.includes(s));
}

const tokenSet = (t: string) => new Set(t.toLowerCase().match(/[a-z0-9{}'-]+/g) ?? []);
function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

// A number is fine when it is a price, a day count, a duration, a time of day, a count of photos/pages,
// or a physical dimension (a six-foot fence is a spec, not a statistic). Anything else could be an invented fact.
const NUM = /(\$)?\d[\d,]*(?:\.\d+)?k?(?:\s*(?:–|-|to)\s*\$?\d[\d,]*(?:\.\d+)?k?)?/gi;
const UNIT_AFTER =
  /^(?:\+|\s|-|\/)*(?:business\s+)?(?:days?|weeks?|months?|years?|yrs?|hours?|hrs?|minutes?|mins?|seconds?|secs?|am|pm|a\.m\.|p\.m\.|nights?|photos?|pages?|shots?|images?|pictures?|feet|foot|ft|inch(?:es)?|in\.|"|'|-?(?:foot|ft|inch|hour|day|week|month|minute|second|page|photo|year)\b)/i;
const UNIT_BEFORE = /(?:\bday|\bdays|\brung|\bweek|\bmonth)\s*$/i;

function badNumbers(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(NUM)) {
    if (m[1]) continue;
    const before = text.slice(0, m.index);
    const after = text.slice(m.index! + m[0].length);
    if (UNIT_BEFORE.test(before) || UNIT_AFTER.test(after)) continue;
    // US emergency and crisis numbers are safety information, never a statistic.
    if (m[0] === "911" || m[0] === "988") continue;
    // A theme combo or type direction id ("C39", "T10") is a name, not a statistic.
    if (/\b[CT]$/.test(before) && /^\d{1,2}$/.test(m[0])) continue;
    if (/\$\s*$/.test(before)) continue;
    out.push(m[0]);
  }
  return out;
}

const EVIDENCE = /%|(?<!case )\bstudies\b|\ba study\b|\bstudy (?:shows|found|says)\b|research shows|on average|\bstatistic(?:s|al|ally)?\b|\bproven\b|\bguarantee(?:d|s)?\b|double your|\b10x\b/gi;
const LINK = /https?:\/\/|www\.|\{demo-link\}|\b[a-z0-9-]+\.(?:com|net|org|io|co|us|app|site)\b/i;
const MEDIA_WORDS = /\b(?:screenshots?|attached|attachments?|attach|images?)\b/i;
const PHOTO_CLAIM = /your (?:own )?photos|photos from your instagram/i;
const PHOTO_OK = /marked placeholders where your photos would go/gi;
const TIER_NAME = /\b(?:starter|standard|premium)\b|care plan|proof deal|spec demo|build tier/i;

function loadDeny(): RegExp[] {
  return readFileSync(DENY_PATH, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const cs = l.startsWith("=");
      const name = (cs ? l.slice(1) : l).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?<![A-Za-z0-9])${name}(?![A-Za-z0-9])`, cs ? "g" : "gi");
    });
}

/** Pitch-shaped lines that the swap test and the repeat test look at. */
function pitchLines(k: CategoryKit): [string, string][] {
  const out: [string, string][] = [];
  k.openers.forEach((o, i) => out.push([`openers[${i}].line`, o.line]));
  k.whatElseYouSell.forEach((x, i) => out.push([`whatElseYouSell[${i}].pitchLine`, x.pitchLine]));
  k.crossSell.withoutAI.forEach((x, i) => out.push([`crossSell.withoutAI[${i}].pitchLine`, x.pitchLine]));
  k.crossSell.withAI.forEach((x, i) => out.push([`crossSell.withAI[${i}].pitchLine`, x.pitchLine]));
  k.softwareAI.forEach((x, i) => out.push([`softwareAI[${i}].pitchLine`, x.pitchLine]));
  k.routesToBiggerBuyer.forEach((x, i) => out.push([`routesToBiggerBuyer[${i}].pitchLine`, x.pitchLine]));
  k.upsellLadder.forEach((x, i) => out.push([`upsellLadder[${i}].line`, x.line]));
  return out;
}

// ---------- the check ----------

export function checkKits(dir = KITS_DIR): CheckResult {
  const problems: Problem[] = [];
  const warnings: Problem[] = [];
  const reports: FileReport[] = [];

  // Identity across the whole board, including categories with no file yet.
  const seen = new Map<string, string>();
  for (const c of CATS) {
    const s = kitSlug(c.n);
    if (seen.has(s)) problems.push({ file: "(board)", rule: "identity", text: `kitSlug "${s}" is shared by "${seen.get(s)}" and "${c.n}"` });
    seen.set(s, c.n);
  }

  const Ajv = unwrap(Ajv2020Import as unknown as Ctor<typeof Ajv2020Import>);
  const addFormats = unwrap(addFormatsImport as unknown as Ctor<typeof addFormatsImport>);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(readFileSync(SCHEMA_PATH, "utf8")));
  const deny = loadDeny();

  let files: string[] = [];
  try { files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort(); } catch { /* no kits yet */ }
  const kits = new Map<string, CategoryKit>();

  for (const file of files) {
    const add = (rule: string, text: string) => problems.push({ file, rule, text });
    let k: CategoryKit;
    try { k = JSON.parse(readFileSync(join(dir, file), "utf8")) as CategoryKit; } catch (e) {
      add("schema", `not valid JSON: ${(e as Error).message}`);
      continue;
    }
    if (!validate(k)) {
      for (const e of validate.errors ?? []) add("schema", `${e.instancePath || "/"} ${e.message}${e.params && "allowedValues" in e.params ? " " + JSON.stringify(e.params.allowedValues) : ""}`);
      reports.push({ file, slug: file.replace(/\.json$/, ""), openers: 0, products: 0, routes: 0, generic: [], repeats: 0, failed: true });
      continue;
    }
    kits.set(file, k);
  }

  for (const [file, k] of kits) {
    const before = problems.length;
    const add = (rule: string, text: string) => problems.push({ file, rule, text });
    const warn = (rule: string, text: string) => warnings.push({ file, rule, text });
    const cat = CATS.find((c) => c.n === k.category);

    // Identity
    if (!cat) add("identity", `category "${k.category}" is not on the board`);
    if (k.slug !== kitSlug(k.category)) add("identity", `slug "${k.slug}" should be "${kitSlug(k.category)}"`);
    if (file !== k.slug + ".json") add("identity", `file name should be ${k.slug}.json`);
    if (k.provenance.reviewStatus === "approved" && !k.provenance.reviewedBy) add("identity", "approved without reviewedBy");

    // Directions
    const dirs = k.designDirections;
    const ids = dirs.map((d) => d.id).sort().join("");
    if (ids !== "abc") add("directions", `ids must be a, b, c once each (got ${ids})`);
    const themeIds = new Set(dirs.map((d) => d.themeId));
    if (themeIds.size !== 3) add("directions", "the three directions must use three different themeIds");
    const typeIds = new Set<string>();
    for (const d of dirs) {
      const t = THEMES[d.themeId as ThemeId];
      if (!t) { add("directions", `${d.id}: themeId ${d.themeId} is not in src/themes/library.ts`); continue; }
      typeIds.add(t.type.id);
      // Contrast
      const tr = ratio(t.text, t.bg);
      if (tr < 4.5) add("contrast", `${d.id} ${d.themeId}: text on bg is ${tr.toFixed(2)}:1`);
      const label = pickReadable(t.accent, [t.bg, t.surface, t.text]);
      const ar = ratio(label, t.accent);
      if (ar < 4.5) add("contrast", `${d.id} ${d.themeId}: CTA label on accent is ${ar.toFixed(2)}:1`);
      if (!d.headlineSample.includes("{City}")) add("directions", `${d.id}: headlineSample has no {City}`);
    }
    if (typeIds.size < 2) add("directions", "the three directions need at least two different type directions");
    if (!dirs.some((d) => d.pairsWithTier === "standard")) add("directions", "no direction pairs with the standard tier");
    if (cat && !dirs.some((d) => d.themeId === STYLE[cat.f][0]))
      warn("directions", `no direction uses the family's current STYLE combo ${STYLE[cat.f][0]}`);

    // Placeholders, Correction 3, evidence, brands — over every string
    for (const [path, text] of strings(k)) {
      for (const m of text.matchAll(/\{[^{}]*\}/g)) if (!PLACEHOLDERS.includes(m[0])) add("placeholders", `${path}: ${m[0]}`);
      if (/[{}]/.test(text.replace(/\{[^{}]*\}/g, ""))) add("placeholders", `${path}: stray brace in "${text}"`);
      if (PHOTO_CLAIM.test(text.replace(PHOTO_OK, ""))) add("correction 3", `${path}: ${text}`);
      for (const m of text.matchAll(EVIDENCE)) add("evidence", `${path}: "${m[0]}" in ${text}`);
      for (const n of badNumbers(text)) add("evidence", `${path}: number "${n}" in ${text}`);
      for (const re of deny) for (const m of text.matchAll(re)) add("brand names", `${path}: ${m[0]}`);
    }
    k.openers.forEach((o, i) => {
      const n = o.linkLine.split("{demo-link}").length - 1;
      if (n !== 1) add("placeholders", `openers[${i}].linkLine has {demo-link} ${n} times`);
      if (LINK.test(o.line)) add("correction 2", `openers[${i}].line carries a link: ${o.line}`);
      if (MEDIA_WORDS.test(o.line)) add("correction 2", `openers[${i}].line mentions an image: ${o.line}`);
      if (/\battach/i.test(o.hook)) add("correction 2", `openers[${i}].hook says attach: ${o.hook}`);
    });
    if (new Set(k.openers.map((o) => o.angle.toLowerCase())).size !== k.openers.length) add("openers", "two openers share an angle");
    if (LINK.test(k.sequence.dm1)) add("correction 2", `sequence.dm1 carries a link`);
    if (MEDIA_WORDS.test(k.sequence.dm1)) add("correction 2", `sequence.dm1 mentions an image or screenshot`);
    if (!k.sequence.dm2.includes("{demo-link}")) add("placeholders", "sequence.dm2 must carry {demo-link}");

    // Money
    const money = (path: string, min: number, max: number, monthly: boolean) => {
      if (min > max) add("money", `${path}: min ${min} > max ${max}`);
      const mid = cat?.size === "mid";
      const cap = monthly ? (mid ? MID_MONTHLY_CAP : MONTHLY_CAP) : mid ? MID_ONE_TIME_CAP : ONE_TIME_CAP;
      if (max > cap) add("money", `${path}: ${max} is over the ${monthly ? "monthly" : "one-time"} cap of ${cap}`);
    };
    k.pricing.lineItems.forEach((x, i) => {
      money(`pricing.lineItems[${i}]`, x.min, x.max, x.unit === "monthly");
      if (TIER_NAME.test(x.item)) add("money", `pricing.lineItems[${i}] names a build tier or the care plan: ${x.item}`);
    });
    k.whatElseYouSell.forEach((x, i) => money(`whatElseYouSell[${i}]`, x.min, x.max, x.unit === "monthly"));
    [...k.crossSell.withoutAI, ...k.crossSell.withAI, ...k.routesToBiggerBuyer].forEach((x) => money(x.route, x.min, x.max, x.unit === "monthly"));
    k.softwareAI.forEach((x, i) => {
      money(`softwareAI[${i}] one-time`, x.oneTimeMin, x.oneTimeMax, false);
      money(`softwareAI[${i}] monthly`, x.monthlyMin, x.monthlyMax, true);
      if (x.kind === "ai" && !/retainer/i.test(x.whenAndWhatItTakes + " " + x.pitchLine))
        add("money", `softwareAI[${i}] ${x.name}: an AI item must say it comes with the maintenance retainer`);
    });
    k.upsellLadder.forEach((x, i) => money(`upsellLadder[${i}]`, x.min, x.max, x.unit === "monthly"));

    // No overlap between blocks 6–9
    const owner = new Map<string, string>();
    const claim = (block: string, name: string) => {
      const key = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const prev = owner.get(key);
      if (prev && prev !== block) add("overlap", `"${name}" is in both ${prev} and ${block}`);
      owner.set(key, block);
    };
    k.whatElseYouSell.forEach((x) => claim("whatElseYouSell", x.name));
    [...k.crossSell.withoutAI, ...k.crossSell.withAI].forEach((x) => claim("crossSell", x.route));
    k.softwareAI.forEach((x) => claim("softwareAI", x.name));
    k.routesToBiggerBuyer.forEach((x) => claim("routesToBiggerBuyer", x.route));

    // Swap test
    const generic: string[] = [];
    if (cat) {
      const { nouns, stems } = categoryNouns(cat);
      const containsTerms = new Set<string>();
      for (const p of k.pageStructurePlus) for (const w of words(p.contains)) if (w.length >= 4 && !STOP.has(w)) containsTerms.add(w);
      for (const m of k.pageStructurePlus.map((p) => p.contains + " " + p.section).join(" ").matchAll(/\b[A-Z]{3,}\b/g)) containsTerms.add(m[0].toLowerCase());
      const sectionTerms = new Set([...containsTerms]);
      for (const p of k.pageStructurePlus) for (const w of words(p.section)) if (w.length >= 4 && !STOP.has(w)) sectionTerms.add(w);
      const lineTerms = new Set([...nouns, ...sectionTerms]);
      k.pageStructurePlus.forEach((p, i) => {
        if (!hasNoun(p.section, new Set([...nouns, ...containsTerms]), stems)) generic.push(`pageStructurePlus[${i}].section: ${p.section}`);
      });
      for (const [path, line] of pitchLines(k)) if (!hasNoun(line, lineTerms, stems)) generic.push(`${path}: ${line}`);
    }
    for (const g of generic) warn("generic", g);
    if (generic.length > MAX_GENERIC) add("swap test", `${generic.length} generic lines (max ${MAX_GENERIC}); see the warnings above`);

    // Ladder
    const L = k.upsellLadder;
    if (L[0] && L[0].day !== 0) add("ladder", `rung 1 is day ${L[0].day}, not day 0`);
    L.forEach((r, i) => {
      if (r.rung !== i + 1) add("ladder", `rung at position ${i + 1} is numbered ${r.rung}`);
      if (i && r.day < L[i - 1]!.day) add("ladder", `rung ${r.rung} (day ${r.day}) comes before rung ${L[i - 1]!.rung} (day ${L[i - 1]!.day})`);
    });

    reports.push({
      file, slug: k.slug, openers: k.openers.length, products: k.softwareAI.length, routes: k.routesToBiggerBuyer.length,
      generic, repeats: 0, failed: problems.length > before,
    });
  }

  // Repeats against siblings in the same family
  for (const [file, k] of kits) {
    const cat = CATS.find((c) => c.n === k.category);
    if (!cat) continue;
    const mine = pitchLines(k).filter(([p]) => p.startsWith("openers") || /pitchLine$/.test(p));
    const report = reports.find((r) => r.file === file)!;
    for (const [otherFile, o] of kits) {
      if (otherFile === file) continue;
      const oc = CATS.find((c) => c.n === o.category);
      if (!oc || oc.f !== cat.f) continue;
      const theirs = pitchLines(o).filter(([p]) => p.startsWith("openers") || /pitchLine$/.test(p)).map(([p, t]) => [p, t, tokenSet(t)] as const);
      for (const [path, line] of mine) {
        const a = tokenSet(line);
        for (const [op, ot, b] of theirs) {
          const j = jaccard(a, b);
          if (j >= REPEAT_AT) {
            problems.push({ file, rule: "repeats", text: `${path} is ${j.toFixed(2)} similar to ${otherFile} ${op}: ${line} ≈ ${ot}` });
            report.repeats++;
            report.failed = true;
          }
        }
      }
    }
  }

  return { problems, warnings, reports };
}

export function summaryLine(r: FileReport): string {
  return `${r.failed ? "✗" : "✓"} ${r.slug}  ${r.openers} openers · ${r.products} products · ${r.routes} routes · ${r.generic.length} generic · ${r.repeats} repeats`;
}
