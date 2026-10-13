// Countries and their regions. The US states are the port's STATES, untouched; Canada's provinces and the UAE's
// emirates sit beside them here. Codes never collide: US states and Canadian provinces are two letters and
// disjoint, emirates are three letters. Cities are listed by size, so the kit's market-size rule (first three a
// major metro, next five mid-size, the rest smaller) works the same way it does for a state.
import { STATES } from "@/data";
import type { StateCode, StateEntry } from "@/data";

export type Country = "US" | "CA" | "AE";
export const COUNTRY_CODES: Country[] = ["US", "CA", "AE"];
export const DEFAULT_COUNTRY: Country = "US";

export interface CountryInfo {
  name: string;
  short: string;
  currency: "USD" | "CAD" | "AED";
  /** What a region is called there. */
  region: string;
  regionPlural: string;
}

export const COUNTRIES: Record<Country, CountryInfo> = {
  US: { name: "United States", short: "USA", currency: "USD", region: "State", regionPlural: "states" },
  CA: { name: "Canada", short: "Canada", currency: "CAD", region: "Province", regionPlural: "provinces" },
  AE: { name: "United Arab Emirates", short: "UAE", currency: "AED", region: "Emirate", regionPlural: "emirates" },
};

export type CaCode = "AB" | "BC" | "MB" | "NB" | "NL" | "NS" | "NT" | "NU" | "ON" | "PE" | "QC" | "SK" | "YT";
export type AeCode = "AUH" | "DXB" | "SHJ" | "AJM" | "UAQ" | "RAK" | "FUJ";
export type RegionCode = StateCode | CaCode | AeCode;

export const CA_REGIONS: Record<CaCode, StateEntry> = {
  ON: ["Ontario", "Toronto|Ottawa|Mississauga|Brampton|Hamilton|London|Markham|Vaughan|Kitchener|Windsor|Richmond Hill|Oakville|Burlington|Oshawa|Barrie|St. Catharines|Cambridge|Kingston|Guelph|Waterloo|Milton|Whitby|Ajax|Sudbury|Thunder Bay|Pickering|Newmarket|Peterborough"],
  QC: ["Quebec", "Montreal|Quebec City|Laval|Gatineau|Longueuil|Sherbrooke|Saguenay|Levis|Trois-Rivieres|Terrebonne|Saint-Jean-sur-Richelieu|Repentigny|Brossard|Drummondville|Saint-Jerome|Granby|Blainville|Mirabel"],
  BC: ["British Columbia", "Vancouver|Surrey|Burnaby|Richmond|Abbotsford|Coquitlam|Kelowna|Langley|Saanich|Delta|Nanaimo|Kamloops|Victoria|Chilliwack|Maple Ridge|North Vancouver|Prince George|New Westminster|Port Coquitlam|Vernon"],
  AB: ["Alberta", "Calgary|Edmonton|Red Deer|Lethbridge|St. Albert|Medicine Hat|Airdrie|Spruce Grove|Grande Prairie|Leduc|Okotoks|Cochrane|Fort McMurray|Sherwood Park|Lloydminster|Canmore"],
  MB: ["Manitoba", "Winnipeg|Brandon|Steinbach|Thompson|Portage la Prairie|Winkler|Selkirk|Morden|Dauphin"],
  SK: ["Saskatchewan", "Saskatoon|Regina|Prince Albert|Moose Jaw|Swift Current|Yorkton|North Battleford|Estevan|Warman|Weyburn"],
  NS: ["Nova Scotia", "Halifax|Dartmouth|Sydney|Truro|New Glasgow|Glace Bay|Kentville|Amherst|Bridgewater|Antigonish"],
  NB: ["New Brunswick", "Moncton|Saint John|Fredericton|Dieppe|Riverview|Miramichi|Edmundston|Bathurst|Quispamsis|Rothesay"],
  NL: ["Newfoundland and Labrador", "St. John's|Mount Pearl|Corner Brook|Conception Bay South|Paradise|Grand Falls-Windsor|Gander|Happy Valley-Goose Bay"],
  PE: ["Prince Edward Island", "Charlottetown|Summerside|Stratford|Cornwall|Montague|Kensington"],
  YT: ["Yukon", "Whitehorse|Dawson City|Watson Lake"],
  NT: ["Northwest Territories", "Yellowknife|Hay River|Inuvik|Fort Smith"],
  NU: ["Nunavut", "Iqaluit|Rankin Inlet|Arviat|Cambridge Bay"],
};

/** Emirates, with the city first and then its main districts, so a rep can target a district the way they would a suburb. */
export const AE_REGIONS: Record<AeCode, StateEntry> = {
  DXB: ["Dubai", "Dubai|Business Bay|Dubai Marina|Jumeirah|Deira|Bur Dubai|Al Barsha|Downtown Dubai|Jumeirah Lake Towers|Dubai Silicon Oasis|Al Quoz|Mirdif|Dubai Hills|Jebel Ali|Al Nahda|International City|Arabian Ranches|Hatta"],
  AUH: ["Abu Dhabi", "Abu Dhabi|Al Ain|Khalifa City|Mussafah|Al Reem Island|Yas Island|Saadiyat Island|Mohammed Bin Zayed City|Al Raha|Ruwais|Madinat Zayed"],
  SHJ: ["Sharjah", "Sharjah|Al Nahda Sharjah|Al Majaz|Muwaileh|Al Khan|Khor Fakkan|Kalba|Dibba Al-Hisn"],
  AJM: ["Ajman", "Ajman|Al Nuaimiya|Al Rashidiya|Al Jurf|Masfout"],
  RAK: ["Ras Al Khaimah", "Ras Al Khaimah|Al Hamra|Al Nakheel|Khuzam|Al Marjan Island"],
  FUJ: ["Fujairah", "Fujairah|Dibba Al-Fujairah|Masafi|Al Bidya"],
  UAQ: ["Umm Al Quwain", "Umm Al Quwain|Al Salamah|Falaj Al Mualla"],
};

/** Every region of every country. A new object: the port's STATES is never mutated. */
export const REGIONS: Record<RegionCode, StateEntry> = { ...STATES, ...CA_REGIONS, ...AE_REGIONS };

export const isRegion = (code: string): code is RegionCode => Object.prototype.hasOwnProperty.call(REGIONS, code);

export function countryOf(code: string): Country {
  if (Object.prototype.hasOwnProperty.call(CA_REGIONS, code)) return "CA";
  if (Object.prototype.hasOwnProperty.call(AE_REGIONS, code)) return "AE";
  return "US";
}

export const regionName = (code: RegionCode): string => REGIONS[code][0];
export const regionCities = (code: RegionCode): string[] => REGIONS[code][1].split("|");

export function regionCodes(country: Country): RegionCode[] {
  if (country === "CA") return Object.keys(CA_REGIONS) as CaCode[];
  if (country === "AE") return Object.keys(AE_REGIONS) as AeCode[];
  return Object.keys(STATES) as StateCode[];
}

/** The region picker's options for a country, alphabetical, labelled "Ontario (ON)". */
export function regionOptions(country: Country): { code: RegionCode; label: string }[] {
  return regionCodes(country)
    .sort((a, b) => REGIONS[a][0].localeCompare(REGIONS[b][0]))
    .map((code) => ({ code, label: REGIONS[code][0] + " (" + code + ")" }));
}

export const isCountry = (v: unknown): v is Country => v === "US" || v === "CA" || v === "AE";

/** "Toronto, ON" in the US and Canada; "Business Bay, Dubai" in the UAE, where the three-letter code means little. */
export function placeLabel(code: RegionCode, city: string): string {
  return countryOf(code) === "AE" ? (city === regionName(code) ? city : city + ", " + regionName(code)) : city + ", " + code;
}
