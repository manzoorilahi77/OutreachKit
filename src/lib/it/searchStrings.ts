// Copy-only search strings for finding buying signals. The app never runs these: a person opens them in their own
// browser, reads the posts, and pastes the good ones into the signals inbox. LinkedIn, Indeed, Upwork, Wellfound, Clutch,
// Reddit and Google all forbid automated access or need an approved key (see the source table in the design spec).
import type { Country } from "@/lib/market/regions";
import type { SignalType } from "./model";

export interface SearchString {
  where: string;
  query: string;
  /** Opens the search in the person's browser. */
  url: string;
  note?: string;
}

const enc = encodeURIComponent;
const LOCATION: Record<Country, string> = { US: "United States", CA: "Canada", AE: "United Arab Emirates" };
const INDEED: Record<Country, string> = { US: "https://www.indeed.com", CA: "https://ca.indeed.com", AE: "https://ae.indeed.com" };
const GOOGLE_PLACE: Record<Country, string> = { US: "", CA: ` (Canada OR Toronto OR Vancouver OR Calgary)`, AE: ` (UAE OR Dubai OR "Abu Dhabi")` };

const linkedinJobs = (q: string, c: Country): SearchString => ({
  where: "LinkedIn Jobs", query: q, url: `https://www.linkedin.com/jobs/search/?keywords=${enc(q)}&location=${enc(LOCATION[c])}&f_TPR=r2592000`,
  note: "Past month. Write to the hiring manager, not the recruiter.",
});
const indeed = (q: string, c: Country): SearchString => ({ where: "Indeed", query: q, url: `${INDEED[c]}/jobs?q=${enc(q)}&fromage=30` });
const google = (q: string, c: Country, note?: string): SearchString => {
  const full = q + GOOGLE_PLACE[c];
  return { where: "Google", query: full, url: `https://www.google.com/search?q=${enc(full)}&tbs=qdr:m`, ...(note ? { note } : {}) };
};

const TENDERS: Record<Country, SearchString[]> = {
  US: [
    { where: "SAM.gov", query: "Contract Opportunities, NAICS 541511 / 541512 / 541519, active", url: "https://sam.gov/search/?index=opp", note: "Filter by the three software and IT NAICS codes. Federal only." },
  ],
  CA: [
    { where: "CanadaBuys", query: "software OR \"web application\" OR website", url: `https://canadabuys.canada.ca/en/tender-opportunities?search_filter=${enc("software")}`, note: "Federal tenders. Provinces and cities run their own portals." },
  ],
  AE: [
    { where: "Dubai eSupply", query: "IT, software, website", url: "https://esupply.dubai.gov.ae/", note: "Needs supplier registration to view most tenders." },
    { where: "Abu Dhabi procurement", query: "IT, software, website", url: "https://www.adgpg.gov.ae/", note: "Tenders are published on the government procurement portal; bidding needs registration." },
  ],
};

export function searchStrings(type: SignalType, country: Country): SearchString[] {
  switch (type) {
    case "dev_role":
      return [
        linkedinJobs("full stack developer contract", country),
        linkedinJobs("react developer", country),
        indeed("\"full stack developer\" OR \"react developer\" OR \"node developer\"", country),
        indeed("wordpress developer", country),
        google(`site:boards.greenhouse.io OR site:jobs.lever.co ("full stack" OR react OR node) developer`, country, "Company career boards. Find the hiring manager on the company site."),
      ];
    case "it_role":
      return [
        linkedinJobs("operations administrator spreadsheets", country),
        indeed("\"data entry\" \"order tracking\"", country),
        indeed("\"IT support\" small business", country),
        google(`site:linkedin.com/jobs ("operations coordinator" OR "office administrator") (spreadsheets OR "manual process")`, country),
      ];
    case "project_post":
      return [
        google(`site:linkedin.com/posts ("looking for an agency" OR "share your portfolio" OR "send your commercials") (website OR app OR software)`, country),
        { where: "Upwork", query: "react OR node OR wordpress, fixed price", url: `https://www.upwork.com/nx/search/jobs/?q=${enc("react node wordpress")}&sort=recency`, note: "Reply within the hour, in 2–3 sentences (Reset, section 03)." },
        google(`("request for quote" OR "looking for a development partner") ("web app" OR portal OR "custom software")`, country),
      ];
    case "tender":
      return [
        ...TENDERS[country],
        google(`(RFP OR "request for proposals") ("website redesign" OR "web application" OR "software development") filetype:pdf`, country),
      ];
    case "looking_for":
      return [
        google(`site:reddit.com ("looking for a developer" OR "recommend a dev shop" OR "need a developer") (startup OR business)`, country),
        google(`site:linkedin.com/posts ("looking for a developer" OR "can anyone recommend a developer" OR "need a web developer")`, country),
      ];
    case "ai_rescue":
      return [
        google(`site:reddit.com ("built with lovable" OR "built with bolt" OR "vibe coded" OR "built with cursor") (broken OR bug OR "need help" OR "need a developer")`, country),
        google(`("ai generated code" OR "vibe coded") app (rescue OR cleanup OR audit) "need a developer"`, country),
      ];
    case "site_launch":
      return [
        google(`site:linkedin.com/posts ("just launched" OR "we launched" OR "proud to launch") ("new website" OR "website for") agency`, country, "Name the site in the first email (Reset, A/B test version B)."),
        google(`("case study" OR "new website") "web design agency" launched`, country),
      ];
  }
}
