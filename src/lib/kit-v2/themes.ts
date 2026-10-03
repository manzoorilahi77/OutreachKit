// Resolves a design direction to its combo in the vendored base-website theme library.
// Colours are derived exactly the way the template derives them (src/themes/active.ts there):
// the CTA label is pickReadable over bg, surface and text; muted text is ensureContrast'd. No hex is changed.
import { THEMES } from "@/themes/library";
import type { Theme, ThemeId } from "@/themes/library";
import { contrastRatio, ensureContrast, pickReadable } from "@/themes/contrast";
import type { CategoryKit, DesignDirection, DirectionId } from "./types";

export const DIRECTION_IDS: DirectionId[] = ["a", "b", "c"];
export const LETTER: Record<DirectionId, "A" | "B" | "C"> = { a: "A", b: "B", c: "C" };

export interface ResolvedDirection {
  direction: DesignDirection;
  theme: Theme;
  colors: { role: "bg" | "surface" | "text" | "muted" | "accent" | "positive" | "negative"; hex: string }[];
  onAccent: string;
  mutedText: string;
  type: { id: string; name: string; fonts: string; display: string; body: string };
}

export const isDirectionId = (v: unknown): v is DirectionId => v === "a" || v === "b" || v === "c";

export function resolveDirection(ck: CategoryKit, id: DirectionId): ResolvedDirection {
  const direction = ck.designDirections.find((d) => d.id === id) ?? ck.designDirections[0]!;
  const theme = THEMES[direction.themeId as ThemeId];
  if (!theme) throw new Error(`${ck.slug}: direction ${direction.id} uses unknown themeId ${direction.themeId}`);
  const harder = (c: string) => (contrastRatio(c, theme.bg) <= contrastRatio(c, theme.surface) ? theme.bg : theme.surface);
  return {
    direction,
    theme,
    colors: (["bg", "surface", "text", "muted", "accent", "positive", "negative"] as const).map((role) => ({ role, hex: theme[role] })),
    onAccent: pickReadable(theme.accent, [theme.bg, theme.surface, theme.text]),
    mutedText: ensureContrast(theme.muted, harder(theme.muted), theme.text),
    type: { id: theme.type.id, name: theme.type.name, fonts: theme.type.fonts, display: theme.type.display, body: theme.type.body },
  };
}

/** "light, warm" — the way src/data/style.ts writes a combo's mode. */
export const modeLabel = (t: Theme) => t.mode + (t.tone ? ", " + t.tone : "");

const SITE_TYPE: Record<string, string> = {
  "local-conversion": "Local conversion",
  "portfolio-showcase": "Portfolio showcase",
  "premium-brand": "Premium brand",
  "booking-first": "Booking first",
  "menu-and-order": "Menu and order",
  enrolment: "Enrolment",
  catalog: "Catalog",
  "editorial-trust": "Editorial trust",
  "emergency-response": "Emergency response",
  "b2b-capability": "B2B capability",
};
export const siteTypeLabel = (s: string) => SITE_TYPE[s] ?? s;
export const tierLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const heroLabel = (h: string) => h.replace(/-/g, " ");
