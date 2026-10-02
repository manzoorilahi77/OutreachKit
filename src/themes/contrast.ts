// Vendored from manzoorilahi77/base-website src/themes/contrast.ts at commit ff0b440e3b4c5bee9b6f9bdafb2458b647641d7e.
// Do not edit by hand: run `pnpm themes:sync`. Everything below this header is a verbatim copy.
// WCAG contrast helpers.
//
// These exist so the template can guarantee AA against ANY of the 50 combos rather
// than assuming a light background. The accent is dark red in C39 and near-white in
// C48 - a button with hard-coded white label text would be unreadable in one of them.
// `pickReadable` chooses the more legible of the theme's own colors instead.

export interface Rgb {
  r: number
  g: number
  b: number
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const channel = (value: number): number => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG 2.1 contrast ratio, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Rounded to 2dp, for display on /style-guide. */
export function contrastRatioLabel(a: string, b: string): string {
  return `${contrastRatio(a, b).toFixed(2)}:1`
}

export type WcagGrade = 'AAA' | 'AA' | 'AA Large' | 'Fail'

export function wcagGrade(a: string, b: string): WcagGrade {
  const ratio = contrastRatio(a, b)
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA Large'
  return 'Fail'
}

/** Returns whichever candidate is most readable on `background`. */
export function pickReadable(background: string, candidates: readonly string[]): string {
  let best = candidates[0] ?? background
  let bestRatio = -1
  for (const candidate of candidates) {
    const ratio = contrastRatio(background, candidate)
    if (ratio > bestRatio) {
      bestRatio = ratio
      best = candidate
    }
  }
  return best
}

function toHex(value: number): string {
  return Math.round(Math.max(0, Math.min(255, value)))
    .toString(16)
    .padStart(2, '0')
}

/** Linear RGB blend. `amount` 0 returns `from`, 1 returns `to`. */
export function mix(from: string, to: string, amount: number): string {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  const blend = (x: number, y: number): number => x + (y - x) * amount
  return `#${toHex(blend(a.r, b.r))}${toHex(blend(a.g, b.g))}${toHex(blend(a.b, b.b))}`.toUpperCase()
}

/**
 * Nudges `color` toward `toward` until it clears `target` contrast on `background`.
 *
 * WHY THIS EXISTS
 * The 50 palettes are transcribed verbatim from the reference library, where `muted`
 * and `accent` are chosen as roles, not guaranteed as body-text colors. Measured
 * across the library, 35 of 50 combos have a `muted` below 4.5:1 on their own
 * background, and 22 of 50 have an `accent` below it. Since the palette values are
 * fixed, legibility has to be solved where the color is consumed.
 *
 * The hue is preserved; only depth changes, and only by as much as AA requires. A
 * combo that already passes is returned untouched.
 */
export function ensureContrast(
  color: string,
  background: string,
  toward: string,
  target = 4.5,
): string {
  if (contrastRatio(color, background) >= target) return color

  for (let step = 1; step <= 50; step += 1) {
    const candidate = mix(color, toward, step / 50)
    if (contrastRatio(candidate, background) >= target) return candidate
  }

  // Palette cannot reach the target; fall back to the most legible option available.
  return toward
}
