// Source: Famysys_Brand_Kit/00_Skill_Prompt and 02_Color_Palette. Mirrors the CSS tokens in globals.css.
export const BRAND = {
  navy: { name: "Deep Enterprise Blue", hex: "#0F2A4A", role: "Primary" },
  charcoal: { name: "Graphite Charcoal", hex: "#2C2E33", role: "Secondary" },
  warm: { name: "Warm White", hex: "#F7F5F2", role: "Neutral" },
  electric: { name: "Electric Blue", hex: "#1E6FFF", role: "Accent" },
} as const;

export type BrandKey = keyof typeof BRAND;

// Logo files and native aspect ratios (width / height) from the brand kit.
export const LOGOS = {
  "primary-blue": { src: "/brand/Primary-Lockup_Blue.png", w: 2204, h: 543, clear: 0.9863 },
  "wordmark-white": { src: "/brand/Wordmark-Primary_White.png", w: 1579, h: 358, clear: 1 },
  "anchor-white": { src: "/brand/Anchor-Mark_White.svg", w: 502, h: 503, clear: 1 },
  "anchor-blue": { src: "/brand/Anchor-Mark_Blue.svg", w: 502, h: 503, clear: 1 },
} as const;

export type LogoKind = keyof typeof LOGOS;
