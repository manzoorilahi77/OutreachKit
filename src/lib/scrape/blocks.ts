// Recognises the pages Google shows instead of results. Pure, so the rules are tested.
import { BLOCK } from "./selectors";
import type { StopCode } from "./types";

export interface Block { code: Extract<StopCode, "captcha" | "consent" | "blocked">; reason: string }

/** Looks at where the page is, what it says, and whether a CAPTCHA frame is on it. Returns null for a normal page. */
export function detectBlock(page: { url: string; text: string; hasCaptchaFrame?: boolean }): Block | null {
  const url = page.url.toLowerCase();
  if (url.includes("consent.google.com") || url.includes("consent.youtube.com"))
    return { code: "consent", reason: "Google showed a consent page that a normal click did not clear." };
  if (url.includes("/sorry/") || page.hasCaptchaFrame)
    return { code: "captcha", reason: "Google showed a CAPTCHA (“unusual traffic”) page." };
  const text = page.text.slice(0, 4000).toLowerCase();
  if (BLOCK.textPhrases.some((p) => text.includes(p)))
    return { code: "captcha", reason: "Google showed a CAPTCHA (“unusual traffic”) page." };
  return null;
}
