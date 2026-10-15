// An IT finder result as a new prospect: an IT or digital business (segment "agency"), with what the Maps listing showed.
import { countryOf, isRegion } from "@/lib/market/regions";
import type { BusinessRow } from "@/lib/scrape/types";
import { companyDomain } from "./keys";
import type { ItProspectInput } from "./model";

export function finderToInput(b: BusinessRow): ItProspectInput {
  const lines = [b.address ? `Address: ${b.address}` : "", ...b.otherLinks.map((l) => `${l.label}: ${l.url}`), b.facebookUrl ? `Facebook: ${b.facebookUrl}` : "",
    b.instagramUrl ? `Instagram: ${b.instagramUrl}` : ""].filter(Boolean);
  return {
    segment: "agency", company: b.name, companyDomain: companyDomain(b.websiteUrl, b.email), websiteUrl: b.websiteUrl, linkedinUrl: "",
    contactName: "", contactTitle: "", email: b.email, phone: b.phone, whatsapp: b.whatsapp, city: b.city, region: isRegion(b.state) ? b.state : "",
    country: isRegion(b.state) ? countryOf(b.state) : "US", teamSize: "", notes: lines.join("\n"), mapsUrl: b.mapsUrl, mapsCategory: b.mapsCategory,
    rating: b.rating, reviewCount: b.reviewCount,
  };
}
