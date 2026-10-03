import { STATES } from "@/data";
import type { StateCode } from "@/data";
import { CATS } from "@/lib/kit/categories";
import type { Device, KitInput } from "@/lib/kit/types";
import { CONSOLE_STRINGS as S } from "@/content/consoleStrings";

export interface ConsoleState {
  cat: string | null;
  device: Device;
  st: StateCode | "";
  listCity: string;
  freeCity: string;
  /** The design direction of a built category kit. Absent until a kit is built with one. */
  dir?: "a" | "b" | "c";
}

export const EMPTY_CONSOLE: ConsoleState = { cat: null, device: "desktop", st: "", listCity: "", freeCity: "" };

export const effectiveCity = (s: ConsoleState) => s.freeCity.trim() || s.listCity;

export function isReady(s: ConsoleState): boolean {
  return !!(s.cat && s.device && s.st && effectiveCity(s));
}

export function missingSteps(s: ConsoleState): string[] {
  const m: string[] = [];
  if (!s.cat) m.push(S.missing.cat);
  if (!s.device) m.push(S.missing.dev);
  if (!s.st) m.push(S.missing.st);
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
  return { cat: s.cat!, device: s.device, st: s.st as StateCode, city: effectiveCity(s), ...details };
}

/** Console choices <-> URL query. Step 4 is never put in a URL. */
export function toQuery(s: ConsoleState): string {
  const q = new URLSearchParams();
  if (s.cat) q.set("cat", s.cat);
  if (s.st) q.set("st", s.st);
  const city = effectiveCity(s);
  if (city) q.set("city", city);
  // The device is only written once there is something else to restore, so a bare URL stays bare.
  if (q.size > 0) q.set("dev", s.device);
  if (q.size > 0 && s.dir) q.set("dir", s.dir);
  return q.toString();
}

export function fromQuery(search: string, defaultDevice: Device = "desktop"): ConsoleState {
  const q = new URLSearchParams(search);
  const cat = q.get("cat");
  const st = q.get("st") as StateCode | null;
  const city = q.get("city") ?? "";
  const validSt = st && st in STATES ? st : "";
  const listed = validSt ? STATES[validSt][1].split("|").includes(city) : false;
  const dir = q.get("dir");
  return {
    ...(dir === "a" || dir === "b" || dir === "c" ? { dir } : {}),
    cat: cat && CATS.some((c) => c.n === cat) ? cat : null,
    device: q.get("dev") === "mobile" ? "mobile" : q.get("dev") === "desktop" ? "desktop" : defaultDevice,
    st: validSt,
    listCity: listed ? city : "",
    freeCity: validSt && city && !listed ? city : "",
  };
}

export function stateOptions(): { code: StateCode; label: string }[] {
  return (Object.keys(STATES) as StateCode[])
    .sort((a, b) => STATES[a][0].localeCompare(STATES[b][0]))
    .map((code) => ({ code, label: STATES[code][0] + " (" + code + ")" }));
}
