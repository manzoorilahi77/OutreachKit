import { ARCH, ARCHFAM, ARCHOVER, NOUN, STATES, STYLE } from "@/data";
import type { Archetype, ArchKey, StateCode } from "@/data";
import type { Category, PriceModel, RunBlock } from "./types";

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function money(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

export function archKey(c: Category): ArchKey {
  return ARCHOVER[c.n] || ARCHFAM[c.f] || "quote";
}
export function archFor(c: Category): Archetype {
  return ARCH[archKey(c)];
}

export function styleLine(f: Category["f"]): string {
  const s = STYLE[f] || STYLE.out;
  return (
    s[1] + " (" + s[0] + "), " + s[2] + " — bg " + s[3] + ", surface " + s[4] + ", text " + s[5] + ", muted " + s[6] +
    ", accent " + s[7] + ", positive " + s[8] + ", negative " + s[9] + "; type: " + s[10]
  );
}

/** The market multiplier priceModel applies: major metro, mid-size, smaller market, unlisted town. */
export function priceMult(msMult: number): number {
  return msMult >= 90 ? 1.15 : msMult >= 40 ? 1 : msMult >= 16 ? 0.85 : 0.8;
}

export function priceModel(c: Category, mult: number): PriceModel {
  const raw = c.price.match(/\$([\d,]+)\D+([\d,]+)/);
  let lo = raw ? +raw[1]!.replace(/,/g, "") : 1200;
  let hi = raw ? +raw[2]!.replace(/,/g, "") : 2500;
  const r = (v: number) => Math.round((v * mult) / 50) * 50;
  lo = r(lo);
  hi = r(hi);
  return {
    min: lo, max: hi, rec: Math.round((lo + hi) / 2 / 50) * 50,
    proofLo: Math.round((lo * 0.55) / 50) * 50, proofHi: Math.round((lo * 0.8) / 50) * 50,
    starterLo: Math.round((lo * 0.55) / 50) * 50, starterHi: Math.round((lo * 0.85) / 50) * 50,
    premLo: Math.round((hi * 1.4) / 50) * 50, premHi: Math.round((hi * 2.2) / 50) * 50,
    careMin: c.tier === "A" ? 79 : c.tier === "B" ? 59 : 49,
    careMax: c.tier === "A" ? 149 : c.tier === "B" ? 119 : 89,
    careRec: c.tier === "A" ? 99 : c.tier === "B" ? 79 : 59,
  };
}

export function citiesOf(st: StateCode): string[] {
  return STATES[st][1].split("|");
}

export function marketSize(st: StateCode | "", city: string): [label: string, mult: number] {
  if (!st) return ["Unknown", 25];
  const i = citiesOf(st).indexOf(city);
  if (i < 0) return ["Unlisted town — assume a smaller market", 12];
  if (i < 3) return ["Major metro", 90];
  if (i < 8) return ["Mid-size market", 40];
  return ["Smaller market", 16];
}

export function gapMid(g: string): number {
  const m = g.match(/(\d+)\D+(\d+)/);
  return m ? (+m[1]! + +m[2]!) / 2 / 100 : 0.45;
}

export function makeTags(c: Category, st: StateCode, city: string): string[] {
  const cs = slug(city), ss = slug(STATES[st][0]), ab = st.toLowerCase();
  const out: string[] = [];
  c.t.forEach((t) => { out.push("#" + cs + t, "#" + t + cs); });
  out.push("#" + ab + c.t[0], "#" + ss + c.t[0], "#" + ss + c.t[1], "#" + cs + ab);
  out.push("#" + cs + NOUN[c.f], "#" + cs + "smallbusiness", "#" + cs + "local", "#" + ss + c.t[2]);
  return [...new Set(out)].slice(0, 14);
}

export function makeMaps(c: Category, st: StateCode, city: string): string[] {
  const loc = city + ", " + st;
  return c.q.map((q) => q + " near " + loc);
}

export function rotation(st: StateCode, city: string): string[] {
  return citiesOf(st).filter((c) => c !== city).slice(0, 10);
}

export function runBlocks(primaryIsMobile: boolean): RunBlock[] {
  const sweep: RunBlock = primaryIsMobile
    ? ["5–25 min", "Instagram sweep — phone", "Work the hashtag list on the Recent tab, never Top. Open roughly 30 profiles at 40 seconds each and apply the first six checks only. Kill fast. Paste survivors into the sheet as you go."]
    : ["5–25 min", "Maps sweep — desktop", "Run one search string in the Maps side panel, scan the list, and middle-click every listing with no Website button into a tab. Aim for 30 profiles. Record name, phone and review count."];
  const cross: RunBlock = primaryIsMobile
    ? ["25–40 min", "Maps cross-check — desktop", "Search each surviving business name in Maps. Confirm the no-website verdict, capture the phone number, review count and rating."]
    : ["25–40 min", "Social cross-check — phone", "Search each name on Instagram and Facebook. Confirm they are active, owner-run and posting. Open any site they do have on your actual phone — ten seconds decides it."];
  return [
    ["0–5 min", "Set the pair", "Open the sheet. Pick today's hashtag and today's rotation city from the pool below — one pair you have not run this week."],
    sweep,
    cross,
    ["40–50 min", "Score and tier", "Run the remaining checks from section 05 on the survivors. Assign Hot, Warm or Skip. Expect around 10 qualified from 30 opened."],
    ["50–58 min", "Capture the hook", "Owner's first name from a caption or a review reply, phone, public email, and one specific detail from a recent job to open with. No hook, no message."],
    ["58–60 min", "Close the loop", "Log tomorrow's hashtag and city. Cross out any search string that produced zero survivors — that is 20 minutes you never spend again."],
  ];
}
