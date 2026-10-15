// A lead's WhatsApp contact: the number's digits with country code ("12145550147"), or a wa.me/message link when that is all the
// listing gave. "" means none. Google Maps says nothing about whether a phone is on WhatsApp; the only sign is a WhatsApp link on the
// listing, or a number someone types in.

const HOSTS = ["wa.me", "api.whatsapp.com", "web.whatsapp.com", "whatsapp.com", "wa.link"];
const onHost = (host: string) => HOSTS.some((h) => host === h || host.endsWith("." + h));
const digitsOf = (s: string) => s.replace(/\D/g, "");
const plausible = (d: string) => d.length >= 7 && d.length <= 15;

export function normalizeWhatsapp(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) {
    let u: URL;
    try { u = new URL(v); } catch { return ""; }
    if (!onHost(u.hostname.toLowerCase().replace(/^www\./, ""))) return "";
    const fromPhone = digitsOf(u.searchParams.get("phone") ?? "");
    if (plausible(fromPhone)) return fromPhone;
    const first = decodeURIComponent(u.pathname.split("/").filter(Boolean)[0] ?? "");
    if (/^\+?[\d\s()-]+$/.test(first) && plausible(digitsOf(first))) return digitsOf(first);
    return u.pathname.length > 1 ? `https://${u.hostname}${u.pathname}`.slice(0, 300) : "";
  }
  if (/^\+?[\d\s().-]+$/.test(v)) {
    const d = digitsOf(v).replace(/^00/, "");
    return plausible(d) ? d : "";
  }
  return "";
}

/** The link to open the chat, or "" when there is no WhatsApp contact. */
export function whatsappHref(v: string | null | undefined): string {
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : /^\d{7,15}$/.test(v) ? `https://wa.me/${v}` : "";
}
