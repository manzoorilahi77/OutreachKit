// Reads one opened Maps listing. Input is the outerHTML of the side panel (SEL.panel); output is plain data.
// It only reads what the listing itself shows. It never follows a link.
import { parseHtml, selectAll, selectOne, textOf, type El } from "./html";
import { normalizeWhatsapp } from "../leads/whatsapp";
import { classifyLink, isOwnSite, unwrapRedirect } from "./links";
import { SEL } from "./selectors";
import type { OtherLink, ParsedListing } from "./types";

const MAX_OTHER = 12;
const NONE: El = { tag: "", attrs: {}, children: [], parent: null };

const label = (el: El | null) => (el ? el.attrs["aria-label"] ?? textOf(el) : "").replace(/\s+/g, " ").trim();
const afterColon = (s: string, word: string) => s.replace(new RegExp(`^${word}\\s*:\\s*`, "i"), "").trim();
const toInt = (s: string) => Number(s.replace(/,/g, ""));

function readRating(root: El): number | null {
  const shown = textOf(selectOne(root, SEL.ratingValue) ?? NONE).trim();
  const fromLabel = /(\d(?:\.\d)?)\s*stars?/i.exec(label(selectOne(root, SEL.ratingLabel)));
  const n = Number(/^\d(?:\.\d)?$/.test(shown) ? shown : fromLabel?.[1]);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? n : null;
}

/** Maps does not always show a count. Accepts "212 reviews" labels, "4.8 stars 212 Reviews" and "(212)" beside the stars. */
function readReviewCount(root: El): number | null {
  for (const el of selectAll(root, SEL.reviewLabel)) {
    const m = /^\(?([\d,]+)\)?\s+reviews?$/i.exec(label(el));
    if (m) return toInt(m[1]!);
  }
  const stars = /stars?\s+([\d,]+)\s+reviews?/i.exec(label(selectOne(root, SEL.ratingLabel)));
  if (stars) return toInt(stars[1]!);
  const block = selectOne(root, SEL.ratingBlock);
  const paren = block ? /\(([\d,]+)\)/.exec(textOf(block)) : null;
  return paren ? toInt(paren[1]!) : null;
}

export function parseListing(html: string): ParsedListing | null {
  const root = parseHtml(html);
  const name = textOf(selectOne(root, SEL.name) ?? NONE);
  if (!name) return null;

  const phoneEl = selectOne(root, SEL.phone);
  const telHref = selectAll(root, 'a[href^="tel:"]')[0]?.attrs.href;
  const phone =
    afterColon(label(phoneEl), "Phone") ||
    decodeURIComponent((phoneEl?.attrs["data-item-id"] ?? "").replace(/^phone:tel:/, "") || (telHref ?? "").replace(/^tel:/, "")).trim();

  // Links the listing shows. Redirect wrappers are unwrapped; nothing is fetched.
  let email = "";
  let facebookUrl = "";
  let instagramUrl = "";
  const other: OtherLink[] = [];
  let whatsapp = "";
  const seen = new Set<string>();
  const addOther = (l: OtherLink) => {
    if (!seen.has(l.url) && other.length < MAX_OTHER) { seen.add(l.url); other.push(l); }
  };

  const websiteHref = unwrapRedirect(selectOne(root, SEL.website)?.attrs.href ?? "");
  const actions = selectAll(root, SEL.actions).map((a) => ({ url: unwrapRedirect(a.attrs.href ?? ""), tip: a.attrs["data-tooltip"] || label(a) }));
  const ownBooking = actions.find((a) => isOwnSite(a.url));

  for (const a of selectAll(root, SEL.links)) {
    const href = a.attrs.href ?? "";
    if (/^mailto:/i.test(href)) {
      const addr = decodeURIComponent(href.slice(7).split("?")[0] ?? "").trim();
      if (!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) email = addr;
      continue;
    }
    const url = unwrapRedirect(href);
    if (!/^https?:/i.test(url) || url === websiteHref || url === ownBooking?.url) continue;
    const wa = normalizeWhatsapp(url);
    if (wa) { if (!whatsapp) whatsapp = wa; continue; }
    const { kind, label: text } = classifyLink(url);
    if (kind === "facebook") { if (!facebookUrl) facebookUrl = url; else if (url !== facebookUrl) addOther({ label: text, url }); }
    else if (kind === "instagram") { if (!instagramUrl) instagramUrl = url; else if (url !== instagramUrl) addOther({ label: text, url }); }
    else if (kind === "social" || kind === "booking") addOther({ label: text, url });
  }

  const hasWebsite = !!websiteHref || !!ownBooking;
  return {
    name,
    phone,
    address: afterColon(label(selectOne(root, SEL.address)), "Address"),
    mapsCategory: textOf(selectOne(root, SEL.category) ?? NONE),
    rating: readRating(root),
    reviewCount: readReviewCount(root),
    email,
    facebookUrl,
    instagramUrl,
    otherLinks: other,
    whatsapp,
    hasWebsite,
    websiteUrl: websiteHref || ownBooking?.url || "",
    websiteSource: websiteHref ? "website" : ownBooking ? "booking-link" : null,
  };
}

/** One result card in the feed. `hasWebsiteButton` is no longer used to skip a card: every card not already saved is opened, because the card doesn't show the phone, address or links. */
export interface Card { href: string; name: string; hasWebsiteButton: boolean }

export function parseCards(feedHtml: string): Card[] {
  const out: Card[] = [];
  for (const card of selectAll(parseHtml(feedHtml), SEL.card)) {
    const link = selectOne(card, SEL.cardLink);
    const href = link?.attrs.href;
    if (!link || !href) continue;
    out.push({ href, name: link.attrs["aria-label"] ?? textOf(link), hasWebsiteButton: selectOne(card, SEL.cardWebsite) !== null });
  }
  return out;
}
