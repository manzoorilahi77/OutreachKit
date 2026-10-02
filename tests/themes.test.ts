import { describe, expect, it } from "vitest";
import { STYLE } from "@/data";
import { THEMES, THEME_LIST, TYPE_DIRECTIONS } from "@/themes/library";
import type { ThemeId } from "@/themes/library";

// src/themes is vendored from base-website (pnpm themes:sync). If a family's STYLE entry and the
// library disagree, the original and the template have drifted: report it, don't "fix" either side.
describe("vendored theme library", () => {
  it("has 50 combos and 10 type directions", () => {
    expect(THEME_LIST).toHaveLength(50);
    expect(Object.keys(TYPE_DIRECTIONS)).toHaveLength(10);
  });

  it.each(Object.entries(STYLE))("STYLE.%s exists in the library with the same seven values", (_fam, s) => {
    const t = THEMES[s[0] as ThemeId];
    expect(t, `${s[0]} is not in the library`).toBeDefined();
    const lib = [t.bg, t.surface, t.text, t.muted, t.accent, t.positive, t.negative].map((h) => h.toUpperCase());
    expect(s.slice(3, 10).map((h) => h.toUpperCase())).toEqual(lib);
  });
});
