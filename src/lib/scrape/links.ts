// Sorting the links a listing shows. Not page layout, so it lives outside selectors.ts.

export type LinkKind = "facebook" | "instagram" | "social" | "booking" | "google" | "other";

const FACEBOOK = ["facebook.com", "fb.com", "fb.me"];
const INSTAGRAM = ["instagram.com"];
const SOCIAL: Record<string, string> = {
  "x.com": "X", "twitter.com": "X", "linkedin.com": "LinkedIn", "youtube.com": "YouTube", "youtu.be": "YouTube", "tiktok.com": "TikTok",
  "pinterest.com": "Pinterest", "threads.net": "Threads", "nextdoor.com": "Nextdoor", "yelp.com": "Yelp", "wa.me": "WhatsApp",
  "whatsapp.com": "WhatsApp", "t.me": "Telegram", "snapchat.com": "Snapchat",
};
/** Third-party booking, ordering and quote pages. A listing that only links to these has no website of its own. */
const BOOKING = [
  "calendly.com", "acuityscheduling.com", "vagaro.com", "booksy.com", "setmore.com", "squareup.com", "opentable.com", "resy.com",
  "ubereats.com", "doordash.com", "grubhub.com", "toasttab.com", "order.online", "thumbtack.com", "angi.com", "homeadvisor.com",
  "mindbodyonline.com", "schedulicity.com", "styleseat.com", "fresha.com", "getjobber.com", "housecallpro.com", "bookatable.com",
];
const GOOGLE = ["google.com", "gstatic.com", "googleusercontent.com", "goo.gl", "g.page", "g.co", "googleapis.com"];

const onHost = (host: string, list: readonly string[]) => list.some((h) => host === h || host.endsWith("." + h));
/** Google's own `google.com/*` hosts, including country domains such as google.co.uk. */
const isGoogleHost = (host: string) => onHost(host, GOOGLE) || /(^|\.)google\.[a-z.]{2,6}$/.test(host);

export function hostOf(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

/** Maps wraps outbound links as google.com/url?q=… */
export function unwrapRedirect(href: string): string {
  try {
    const u = new URL(href, "https://www.google.com");
    if (isGoogleHost(u.hostname.toLowerCase()) && u.pathname === "/url") return u.searchParams.get("q") ?? u.searchParams.get("url") ?? href;
  } catch { /* not a URL */ }
  return href;
}

export function classifyLink(url: string): { kind: LinkKind; label: string } {
  const host = hostOf(url);
  if (!host) return { kind: "other", label: "" };
  if (onHost(host, FACEBOOK)) return { kind: "facebook", label: "Facebook" };
  if (onHost(host, INSTAGRAM)) return { kind: "instagram", label: "Instagram" };
  const social = Object.keys(SOCIAL).find((h) => onHost(host, [h]));
  if (social) return { kind: "social", label: SOCIAL[social]! };
  if (onHost(host, BOOKING)) return { kind: "booking", label: "Booking: " + host };
  if (isGoogleHost(host)) return { kind: "google", label: "" };
  return { kind: "other", label: host };
}

/** An http(s) link to a domain that is not Google, a social network or a third-party booking page. */
export function isOwnSite(url: string): boolean {
  return /^https?:/i.test(url) && classifyLink(url).kind === "other";
}

/** `@handle` from an Instagram profile URL, or "" if the URL is not a profile. */
export function instagramHandle(url: string): string {
  try {
    const u = new URL(url);
    if (!onHost(u.hostname.toLowerCase().replace(/^www\./, ""), INSTAGRAM)) return "";
    const first = u.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[\w.]{1,30}$/.test(first) && !["p", "reel", "reels", "explore", "accounts", "stories"].includes(first.toLowerCase()) ? "@" + first : "";
  } catch {
    return "";
  }
}
