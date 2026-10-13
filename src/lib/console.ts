import { findCategory } from "@/lib/kit/categories";
import type { Size } from "@/lib/kit/extBoard";
import type { Device, KitInput } from "@/lib/kit/types";
import { isSiteLang, type SiteLang } from "@/lib/market/notes";
import { COUNTRIES, DEFAULT_COUNTRY, countryOf, isCountry, isRegion, regionCities, regionOptions, type Country, type RegionCode } from "@/lib/market/regions";
import { CONSOLE_STRINGS as S } from "@/content/consoleStrings";

export interface ConsoleState {
  /** Chosen first; the US unless the rep picks Canada or the UAE. Filters the categories and the regions. */
  country: Country;
  /** Small business or mid-size: the tab the category list shows. */
  size: Size;
  cat: string | null;
  device: Device;
  st: RegionCode | "";
  listCity: string;
  freeCity: string;
  /** The design direction of a built category kit. Absent until a kit is built with one. */
  dir?: "a" | "b" | "c";
  /** UAE only: the prospect site's language. */
  lang: SiteLang;
}

export const EMPTY_CONSOLE: ConsoleState = { country: DEFAULT_COUNTRY, size: "small", cat: null, device: "desktop", st: "", listCity: "", freeCity: "", lang: "en" };

export const effectiveCity = (s: ConsoleState) => s.freeCity.trim() || s.listCity;

export function isReady(s: ConsoleState): boolean {
  return !!(s.cat && s.device && s.st && effectiveCity(s));
}

export function missingSteps(s: ConsoleState): string[] {
  const m: string[] = [];
  if (!s.cat) m.push(S.missing.cat);
  if (!s.device) m.push(S.missing.dev);
  if (!s.st) m.push(s.country === "US" ? S.missing.st : S.missing.st.replace("state", COUNTRIES[s.country].region.toLowerCase()));
  else if (!effectiveCity(s)) m.push(S.missing.city);
  return m;
}

export function statusLine(s: ConsoleState): string {
  return isReady(s) ? S.ready : S.stillNeeded(missingSteps(s));
}

export function barLine(s: ConsoleState): string {
  const city = effectiveCity(s);
  return [s.cat ?? S.noCategory, city ? city + (s.st ? ", " + s.st : "") : S.noCity].join("  ·  ");
}

export function toKitInput(s: ConsoleState, details: { you?: string; brand?: string; domain?: string } = {}): KitInput | null {
  if (!isReady(s)) return null;
  const st = s.st as RegionCode;
  return { cat: s.cat!, device: s.device, st, city: effectiveCity(s), ...details, ...(countryOf(st) === "AE" ? { lang: s.lang } : {}) };
}

/** Console choices <-> URL query. Step 4 is never put in a URL. */
export function toQuery(s: ConsoleState): string {
  const q = new URLSearchParams();
  if (!s.st && s.country !== DEFAULT_COUNTRY) q.set("country", s.country);
  if (!s.cat && s.size === "mid") q.set("size", "mid");
  if (s.cat) q.set("cat", s.cat);
  if (s.st) q.set("st", s.st);
  const city = effectiveCity(s);
  if (city) q.set("city", city);
  // The device is only written once there is something else to restore, so a bare URL stays bare.
  if (q.size > 0) q.set("dev", s.device);
  if (q.size > 0 && s.dir) q.set("dir", s.dir);
  if (s.country === "AE" && s.lang !== "en") q.set("lang", s.lang);
  return q.toString();
}

export function fromQuery(search: string, defaultDevice: Device = "desktop"): ConsoleState {
  const q = new URLSearchParams(search);
  const cat = q.get("cat");
  const st = q.get("st") ?? "";
  const city = q.get("city") ?? "";
  const validSt: RegionCode | "" = isRegion(st) ? st : "";
  const listed = validSt ? regionCities(validSt).includes(city) : false;
  const dir = q.get("dir");
  const c = cat ? findCategory(cat) : undefined;
  const qc = q.get("country");
  const country: Country = validSt ? countryOf(validSt) : isCountry(qc) ? qc : DEFAULT_COUNTRY;
  const lang = q.get("lang");
  return {
    country,
    size: c ? c.size : q.get("size") === "mid" ? "mid" : "small",
    lang: country === "AE" && isSiteLang(lang) ? lang : "en",
    ...(dir === "a" || dir === "b" || dir === "c" ? { dir } : {}),
    cat: c ? c.n : null,
    device: q.get("dev") === "mobile" ? "mobile" : q.get("dev") === "desktop" ? "desktop" : defaultDevice,
    st: validSt,
    listCity: listed ? city : "",
    freeCity: validSt && city && !listed ? city : "",
  };
}

/** The region picker's options: the 51 US states by default, or a country's provinces or emirates. */
export function stateOptions(country: Country = DEFAULT_COUNTRY): { code: RegionCode; label: string }[] {
  return regionOptions(country);
}
