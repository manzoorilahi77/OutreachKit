// Copy the market layer adds to a kit. Prompts to check, never legal advice and never statistics.
import type { Country } from "./regions";

export type SiteLang = "en" | "ar" | "bi";
export const SITE_LANGS: SiteLang[] = ["en", "ar", "bi"];
export const isSiteLang = (v: unknown): v is SiteLang => v === "en" || v === "ar" || v === "bi";

export const LANG_LABEL: Record<SiteLang, string> = { en: "English (LTR)", ar: "Arabic (RTL)", bi: "English + Arabic" };
export const LANG_HINT: Record<SiteLang, string> = {
  en: "English only, left to right. The prompt keeps the layout direction-neutral so Arabic can be added later.",
  ar: "Arabic only, right to left. The prompt asks for a mirrored layout and an Arabic-capable font.",
  bi: "Both, with a language switch. Two locales, /en and /ar, each with its own direction.",
};

export const MID_NOTE =
  "Mid-size company: most already have a site, so \"no real site\" here means a weak or dated one. The buyer is usually a manager with one or two people to convince, so expect a longer cycle than a small business and lead with the system (booking, portal, locations), not the look.";

export const COUNTRY_NOTES: Record<Exclude<Country, "US">, { title: string; items: (region: string) => string[] }> = {
  CA: {
    title: "Working in Canada — swap these in for the US steps above",
    items: (region) => [
      "Use the " + region + " business registry (or the federal corporations search for federally registered companies) in place of the Secretary of State search.",
      "Licensed trades and health professions are licensed provincially: look up the " + region + " regulator or college for the trade.",
      "Cold email and texts fall under Canada's anti-spam law (CASL). Message only a business address the owner publishes, keep it about their business, and include your address and a working unsubscribe.",
      "In Quebec, a site for the public needs French; quote the French version as its own line item.",
      "Prices below are in Canadian dollars.",
    ],
  },
  AE: {
    title: "Working in the UAE — swap these in for the US steps above",
    items: (region) => [
      "Confirm the trade name and licensed activity with the " + region + " economic department's trade licence search; free-zone companies are listed by their free-zone authority.",
      "Most owners run the business on WhatsApp. A WhatsApp business number on the site often matters more than a contact form, and it is the usual first-message channel.",
      "Marketing calls and messages are regulated: contact in business hours only, stop at the first request, and check the current rules before you run a calling block.",
      "Instagram and Google Maps work as they do in the US; Nextdoor and county permit records don't exist here — skip those sources.",
      "Prices below are in dirhams. Many buyers expect a bilingual site; the Kit Console sets the build prompt's language.",
    ],
  },
};

export const HEALTH_NOTES: Record<Country, string[]> = {
  US: [
    "Booking and intake forms that collect health information fall under HIPAA. Either use a host and form service that will sign a business associate agreement, or keep the forms to name, phone and preferred time.",
    "No patient testimonials, photos or before-and-after images without written consent on file.",
    "No outcome claims or guarantees. Credentials and licence numbers come from the practice, never from you — leave bracketed placeholders.",
  ],
  CA: [
    "Health information is covered by provincial health-privacy laws (Ontario's PHIPA, for example) and federal privacy law. Keep intake forms on a host the clinic's privacy officer approves, or limit them to contact details.",
    "Provincial colleges set advertising rules for their professions, including testimonials. Check the college's rules before the site shows any.",
    "No outcome claims or guarantees; credentials and registration numbers are supplied by the practice.",
  ],
  AE: [
    "Medical advertising, including website and social content, needs approval from the health authority for the emirate (DHA in Dubai, DOH in Abu Dhabi, MOHAP in the other emirates) before it goes live. Build the content so it can be submitted as a pack.",
    "Patient health data is expected to be stored in the UAE. Choose hosting and form handling with that in mind, or keep forms to contact details.",
    "No patient photos, testimonials or before-and-after images without written consent; no outcome claims or price-led promotions the authority hasn't approved.",
  ],
};

export function langBlock(lang: SiteLang): string {
  const common = [
    "- Phone numbers in +971 format with a WhatsApp click-to-chat link next to the call button. Prices in AED.",
    "- Use logical CSS properties everywhere (margin-inline, padding-inline, inset-inline, text-align: start). Never hard-code left or right.",
  ];
  if (lang === "en")
    return ["Language and direction — UAE", "- English only, left to right: <html lang=\"en\" dir=\"ltr\">.", ...common, "- Keep components direction-neutral so an Arabic locale can be added later without a rewrite."].join("\n");
  const rtl = [
    "- Mirror the layout for Arabic: navigation, cards, carousels, steps and direction-bearing icons (arrows, chevrons) run right to left. Logos, phone numbers, emails and price figures stay left to right inside their own spans.",
    "- The theme's type pairing may have no Arabic glyphs. Add one Arabic-capable family through next/font for Arabic text and keep the theme's tokens for everything else; tell me which family you chose.",
    "- Arabic copy comes from a fluent writer, not machine translation. Where I have not supplied it, render a visible placeholder such as [ARABIC COPY — headline].",
  ];
  if (lang === "ar")
    return ["Language and direction — UAE", "- Arabic only, right to left: <html lang=\"ar\" dir=\"rtl\">.", ...common, ...rtl, "- Done when: every route renders correctly with dir=\"rtl\" at 390px and 1280px, with no mirrored logos and no left-to-right leftovers."].join("\n");
  return [
    "Language and direction — UAE",
    "- English and Arabic as two locales, /en and /ar, with a language switch in the header that keeps the visitor on the same page.",
    "- Set lang and dir per locale (en → ltr, ar → rtl), add hreflang alternates and list both locales in the sitemap.",
    ...common,
    ...rtl,
    "- The contact form's labels, help text and validation messages exist in both languages.",
    "- Done when: every route renders in both locales at 390px and 1280px, and switching language never drops the visitor on the home page.",
  ].join("\n");
}
