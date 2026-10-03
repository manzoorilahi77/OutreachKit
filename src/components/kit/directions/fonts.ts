// The twelve Google font families behind the base-website template's ten type directions (T1–T10),
// declared the way the template declares them (base-website src/themes/fonts.ts). They draw the
// direction previews only; the app's own UI stays in Jost.
//
// WHY next/font/google AND NOT A <link>
// next/font downloads the files at BUILD time and serves them from this app, so viewing a preview never
// makes a request to a third-party font host.
//
// WHY EVERY LOADER SETS `preload: false`
// Same reason the template gives: with twelve families declared, preloading would download all twelve on
// every page. With preload off the browser fetches a family only when preview text actually uses it, and
// `display: 'swap'` keeps text visible while it loads.
import {
  Bitter, Bodoni_Moda, DM_Sans, IBM_Plex_Sans, Inter, Jost, Libre_Caslon_Text, Nunito, Nunito_Sans, Source_Sans_3, Source_Serif_4, Zilla_Slab,
} from "next/font/google";
import type { FontFamilyKey } from "@/themes/library";

const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--pv-inter" });
const nunitoSans = Nunito_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--pv-nunito-sans" });
const sourceSerif4 = Source_Serif_4({ subsets: ["latin"], display: "swap", preload: false, variable: "--pv-source-serif-4" });
const bitter = Bitter({ subsets: ["latin"], display: "swap", preload: false, variable: "--pv-bitter" });
const jost = Jost({ subsets: ["latin"], display: "swap", preload: false, variable: "--pv-jost" });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--pv-dm-sans" });
const sourceSans3 = Source_Sans_3({ subsets: ["latin"], display: "swap", preload: false, variable: "--pv-source-sans-3" });
const nunito = Nunito({ subsets: ["latin"], display: "swap", preload: false, variable: "--pv-nunito" });
const bodoniModa = Bodoni_Moda({ subsets: ["latin"], display: "swap", preload: false, variable: "--pv-bodoni-moda" });
const libreCaslonText = Libre_Caslon_Text({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"], variable: "--pv-libre-caslon-text" });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"], variable: "--pv-ibm-plex-sans" });
const zillaSlab = Zilla_Slab({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"], variable: "--pv-zilla-slab" });

export const PREVIEW_FONTS: Record<FontFamilyKey, { label: string; cssVar: string; className: string }> = {
  bitter: { label: "Bitter", cssVar: "--pv-bitter", className: bitter.variable },
  bodoniModa: { label: "Bodoni Moda", cssVar: "--pv-bodoni-moda", className: bodoniModa.variable },
  dmSans: { label: "DM Sans", cssVar: "--pv-dm-sans", className: dmSans.variable },
  ibmPlexSans: { label: "IBM Plex Sans", cssVar: "--pv-ibm-plex-sans", className: ibmPlexSans.variable },
  inter: { label: "Inter", cssVar: "--pv-inter", className: inter.variable },
  jost: { label: "Jost", cssVar: "--pv-jost", className: jost.variable },
  libreCaslonText: { label: "Libre Caslon Text", cssVar: "--pv-libre-caslon-text", className: libreCaslonText.variable },
  nunito: { label: "Nunito", cssVar: "--pv-nunito", className: nunito.variable },
  nunitoSans: { label: "Nunito Sans", cssVar: "--pv-nunito-sans", className: nunitoSans.variable },
  sourceSans3: { label: "Source Sans 3", cssVar: "--pv-source-sans-3", className: sourceSans3.variable },
  sourceSerif4: { label: "Source Serif 4", cssVar: "--pv-source-serif-4", className: sourceSerif4.variable },
  zillaSlab: { label: "Zilla Slab", cssVar: "--pv-zilla-slab", className: zillaSlab.variable },
};

export function previewFonts(display: string, body: string) {
  const d = PREVIEW_FONTS[display as FontFamilyKey] ?? PREVIEW_FONTS.inter;
  const b = PREVIEW_FONTS[body as FontFamilyKey] ?? PREVIEW_FONTS.inter;
  return {
    className: d.className === b.className ? d.className : d.className + " " + b.className,
    display: `var(${d.cssVar})`,
    body: `var(${b.cssVar})`,
    labels: d.label === b.label ? d.label : d.label + " + " + b.label,
  };
}
