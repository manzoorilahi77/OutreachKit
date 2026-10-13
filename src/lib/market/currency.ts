// Prices in a kit are written in US dollars (the port's price model and every kit file). For Canada and the UAE
// the finished kit's text is converted at one fixed rate per currency, set by an admin in Settings, and rounded to
// numbers a rep can say out loud. Pure: no rates are fetched.
import type { Country } from "./regions";

export type Currency = "USD" | "CAD" | "AED";
export type Rates = Record<Exclude<Currency, "USD">, number>;

/** Planning rates, used until an admin sets their own in Settings. */
export const DEFAULT_RATES: Rates = { CAD: 1.37, AED: 3.67 };

export const CURRENCY_OF: Record<Country, Currency> = { US: "USD", CA: "CAD", AE: "AED" };
const PREFIX: Record<Currency, string> = { USD: "$", CAD: "C$", AED: "AED " };

export const rateFor = (c: Currency, rates: Rates): number => (c === "USD" ? 1 : rates[c]);

/** Keeps only sane, positive rates; anything else falls back to the default. */
export function cleanRates(r: Partial<Record<string, unknown>> | undefined): Rates {
  const ok = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1000 ? v : d);
  return { CAD: ok(r?.CAD, DEFAULT_RATES.CAD), AED: ok(r?.AED, DEFAULT_RATES.AED) };
}

/** Rounds a converted amount to a friendly figure: 5s under 100, 10s under 1,000, 50s under 10,000, then 100s and 1,000s. */
export function friendly(v: number): number {
  const step = v < 100 ? 5 : v < 1000 ? 10 : v < 10000 ? 50 : v < 100000 ? 100 : 1000;
  const r = Math.round(v / step) * step;
  return r === 0 && v > 0 ? step : r;
}

/** A "k" figure: halves under 10k ("5.5k"), whole numbers above. */
function friendlyK(v: number): string {
  const r = v < 10 ? Math.round(v * 2) / 2 : Math.round(v);
  return String(r);
}

const num = (s: string) => Number(s.replace(/,/g, ""));
const fmt = (n: number) => n.toLocaleString("en-US");

function convertOne(value: string, k: string | undefined, rate: number): string {
  const v = num(value) * rate;
  if (k) return friendlyK(v) + k;
  if (num(value) === 0) return "0";
  return fmt(friendly(v));
}

// "$1,800–3,000", "$4k–12k", "$300–3k", "$1.5k", "$99" — the forms the port and the kit files use.
const MONEY = /\$(\d[\d,]*(?:\.\d+)?)(k\b)?(?:(–|-)(\d[\d,]*(?:\.\d+)?)(k\b)?)?/g;

/** Converts every dollar amount in a piece of text. USD returns the text unchanged. */
export function convertMoneyText(text: string, currency: Currency, rates: Rates): string {
  if (currency === "USD" || !text.includes("$")) return text;
  const rate = rateFor(currency, rates);
  return text.replace(MONEY, (_m, lo: string, lk: string | undefined, dash: string | undefined, hi: string | undefined, hk: string | undefined) =>
    PREFIX[currency] + convertOne(lo, lk, rate) + (dash && hi ? dash + convertOne(hi, hk, rate) : ""));
}

/** A whole-number USD amount as the currency's text, for UI outside the kit. */
export function moneyIn(usd: number, currency: Currency, rates: Rates): string {
  return convertMoneyText("$" + fmt(usd), currency, rates);
}
