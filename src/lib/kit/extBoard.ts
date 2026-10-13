// The category catalogue beyond the port: healthcare and mid-size categories, the display families
// ("groups") the Board and the Kit Console show, business size, and where each category sells.
//
// The port's BOARD (src/data) is untouched. Each new category names an engine family `f` from the port's 13,
// whose sources, tone and style the ported kit uses; `group` is the family it is shown under. Scores use the
// same seven factors and weights as the port: TKT GAP ROI DEN ACC REC CLR. For mid-size rows, GAP is the share
// with a weak or dated site rather than no site at all. Every figure is a planning estimate, not researched data.
// See docs/expansion/category-analysis.md for the reasoning behind each row.
import type { ArchKey, FamKey } from "@/data";
import type { Country } from "@/lib/market/regions";

export type Size = "small" | "mid";
export type GroupKey = FamKey | "health";
export type Fit = "strong" | "fits" | "no";

export const SIZE_LABEL: Record<Size, string> = { small: "Small business", mid: "Mid-size" };
export const SIZE_SHORT: Record<Size, string> = { small: "Small", mid: "Mid-size" };

/** Groups beyond the port's families. The port's families keep their own labels. */
export const EXT_GROUPS: Partial<Record<GroupKey, string>> = { health: "Healthcare" };

/** Port categories shown under Healthcare. Their kits are unchanged; only the family they are listed under moves. */
export const HEALTH_REGROUP = new Set([
  "Chiropractic clinics", "Physical therapy & small clinics", "Therapists & counsellors", "Home care & senior care", "Med spa & injectables",
]);

export interface ExtRow {
  n: string;
  group: GroupKey;
  /** Engine family: whose sources, tone and style the ported kit uses. */
  f: FamKey;
  size: Size;
  tkt: string;
  price: string;
  gap: string;
  /** TKT GAP ROI DEN ACC REC CLR */
  digits: string;
  note: string;
  q: string;
  t: string;
  lic: 0 | 1;
  arch?: ArchKey;
  /** Care plan [min, max, recommended] per month, when the tier default would undersell it. */
  care?: [number, number, number];
  /** The small category this is the mid-size version of. */
  smallOf?: string;
  fit: Record<Country, Fit>;
}

const MID_CARE: [number, number, number] = [299, 799, 499];
const MID_CARE_HI: [number, number, number] = [399, 999, 599];
const HEALTH_CARE: [number, number, number] = [129, 249, 179];

export const EXT_BOARD: ExtRow[] = [
  // ---------- Healthcare, small: owner-run practices ----------
  {
    n: "Dental practices", group: "health", f: "pro", size: "small", tkt: "$150–5k/patient", price: "$3,000–5,000", gap: "20–30%", digits: "4254354",
    note: "Most have a site from a dental marketing vendor that looks like every other one. Sell new-patient booking and treatment pages, not a first website.",
    q: "dentist|family dentist|dental clinic|cosmetic dentist|emergency dentist", t: "dentist|dental|smile", lic: 1, arch: "book", care: HEALTH_CARE,
    fit: { US: "fits", CA: "strong", AE: "strong" },
  },
  {
    n: "Orthodontists", group: "health", f: "pro", size: "small", tkt: "$3k–8k/case", price: "$3,000–5,000", gap: "15–25%", digits: "5252344",
    note: "Highest case value in small healthcare. Parents compare three practices on a phone; a clear treatment and payment-plan page wins the consult.",
    q: "orthodontist|braces|clear aligners|invisible braces|kids orthodontist", t: "orthodontist|braces|aligners", lic: 1, arch: "consult", care: HEALTH_CARE,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Optometry & eyewear", group: "health", f: "pro", size: "small", tkt: "$150–800", price: "$2,200–3,800", gap: "25–35%", digits: "3344444",
    note: "Independents lose eye exams to chains that let you book online. Exam booking plus a frames gallery is the whole pitch.",
    q: "optometrist|eye exam|eye doctor|eyeglasses store|contact lens exam", t: "optometrist|eyewear|eyeexam", lic: 1, arch: "book", care: HEALTH_CARE,
    fit: { US: "fits", CA: "strong", AE: "fits" },
  },
  {
    n: "Hearing & audiology clinics", group: "health", f: "pro", size: "small", tkt: "$2k–6k/pair", price: "$2,000–3,500", gap: "30–40%", digits: "4353444",
    note: "Big ticket, older buyers who research before they call, and their adult children doing the searching. A free hearing test booking is the hook.",
    q: "audiologist|hearing test|hearing aids|hearing clinic|tinnitus clinic", t: "hearingaids|audiologist|hearing", lic: 1, arch: "book", care: HEALTH_CARE,
    fit: { US: "fits", CA: "strong", AE: "fits" },
  },
  {
    n: "Podiatry & foot clinics", group: "health", f: "pro", size: "small", tkt: "$100–3k", price: "$2,000–3,500", gap: "30–40%", digits: "3343444",
    note: "Condition-driven searches (heel pain, ingrown nail, orthotics) and almost no condition pages. Easy specificity win.",
    q: "podiatrist|foot doctor|foot clinic|custom orthotics|ingrown toenail treatment", t: "podiatrist|footcare|orthotics", lic: 1, arch: "book", care: HEALTH_CARE,
    fit: { US: "fits", CA: "fits", AE: "fits" },
  },
  {
    n: "Speech & occupational therapy", group: "health", f: "pro", size: "small", tkt: "$100–200/session", price: "$2,000–3,500", gap: "35–45%", digits: "3443454",
    note: "Parents search at night, worried, and want to know who the clinic helps and what the first visit looks like. Long-running care, strong retention.",
    q: "speech therapist|speech therapy for kids|occupational therapy|pediatric therapy clinic|feeding therapy", t: "speechtherapy|occupationaltherapy|slp", lic: 1, arch: "consult", care: HEALTH_CARE,
    fit: { US: "fits", CA: "strong", AE: "strong" },
  },
  {
    n: "Acupuncture & traditional medicine", group: "health", f: "care", size: "small", tkt: "$80–150/visit", price: "$1,500–2,500", gap: "45–55%", digits: "2443544",
    note: "Solo practitioners on a booking-platform page and nothing else. Cheap to build for, quick to close, steady care-plan revenue.",
    q: "acupuncture|acupuncturist|traditional chinese medicine|cupping therapy|herbal medicine clinic", t: "acupuncture|tcm|cupping", lic: 1, arch: "book",
    fit: { US: "fits", CA: "strong", AE: "fits" },
  },
  {
    n: "IV therapy & wellness clinics", group: "health", f: "care", size: "small", tkt: "$150–400/drip", price: "$2,000–3,500", gap: "35–45%", digits: "3443444",
    note: "Young, Instagram-first clinics with a menu of drips and no way to book one. Memberships make the care plan an easy add.",
    q: "iv therapy|iv drip clinic|hydration therapy|mobile iv|vitamin drip", t: "ivtherapy|ivdrip|hydration", lic: 1, arch: "book",
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Dermatology & skin clinics", group: "health", f: "pro", size: "small", tkt: "$150–3k", price: "$2,500–4,500", gap: "20–30%", digits: "4254344",
    note: "Medical and cosmetic work under one roof, and patients who search by condition. Treatment pages and consult booking carry the build.",
    q: "dermatologist|skin clinic|acne treatment|mole check|cosmetic dermatology", t: "dermatology|skinclinic|dermatologist", lic: 1, arch: "consult", care: HEALTH_CARE,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Independent pharmacies", group: "health", f: "pro", size: "small", tkt: "$20–200/visit", price: "$1,800–3,000", gap: "30–40%", digits: "2344454",
    note: "Competing with chains on service, not price. Refill requests, vaccination booking and a services list are the site.",
    q: "pharmacy|independent pharmacy|compounding pharmacy|vaccination pharmacy|prescription refill", t: "pharmacy|pharmacist|compounding", lic: 1, arch: "catalog",
    fit: { US: "fits", CA: "strong", AE: "fits" },
  },
  {
    n: "Veterinary clinics", group: "pet", f: "pet", size: "small", tkt: "$100–3k", price: "$2,500–4,000", gap: "20–30%", digits: "4254354",
    note: "Animal health with real ticket sizes. Appointment booking, wellness plans and a clear emergency page beat the template most clinics run.",
    q: "veterinarian|vet clinic|animal hospital|emergency vet|pet vaccinations", t: "vet|veterinarian|vetclinic", lic: 1, arch: "book", care: HEALTH_CARE,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },

  // ---------- Healthcare, mid-size: groups and centres ----------
  {
    n: "Multi-location dental groups", group: "health", f: "pro", size: "mid", tkt: "$150–5k/patient, 3–15 sites", price: "$12,000–30,000", gap: "40–60%", digits: "5353354",
    note: "Grew by buying practices, so every location has a different site. One brand, one booking flow and a page per location is a real project with a real budget.",
    q: "dental group|dental clinics|family dental centers|dental care locations|dentist near me", t: "dentalgroup|dentist|dental", lic: 1, arch: "book", care: MID_CARE, smallOf: "Dental practices",
    fit: { US: "fits", CA: "strong", AE: "strong" },
  },
  {
    n: "Urgent care & walk-in clinics", group: "health", f: "pro", size: "mid", tkt: "$150–400/visit", price: "$10,000–25,000", gap: "35–50%", digits: "4353354",
    note: "Patients choose on wait time and distance from a phone. Online check-in, live wait times and location pages are what they buy.",
    q: "urgent care|walk-in clinic|after hours clinic|minor emergency clinic|same day doctor", t: "urgentcare|walkinclinic|clinic", lic: 1, arch: "book", care: MID_CARE,
    fit: { US: "strong", CA: "strong", AE: "fits" },
  },
  {
    n: "Polyclinics & multi-specialty centres", group: "health", f: "pro", size: "mid", tkt: "$100–2k/visit", price: "$15,000–35,000", gap: "40–55%", digits: "5353353",
    note: "Ten departments behind one generic home page. A doctor directory, department pages and booking per specialty is the brief, and it renews.",
    q: "polyclinic|medical center|multi specialty clinic|medical centre|family medicine clinic", t: "polyclinic|medicalcenter|clinic", lic: 1, arch: "book", care: MID_CARE_HI,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Diagnostic imaging & labs", group: "health", f: "pro", size: "mid", tkt: "$100–2k/scan", price: "$10,000–25,000", gap: "40–55%", digits: "4343344",
    note: "Referral-driven, but self-pay patients now shop on price and appointment time. Test menus, prep instructions and booking close the gap.",
    q: "mri center|diagnostic imaging|blood test lab|ultrasound clinic|x-ray clinic", t: "diagnostics|imaging|lab", lic: 1, arch: "book", care: MID_CARE,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Fertility & IVF clinics", group: "health", f: "pro", size: "mid", tkt: "$12k–25k/cycle", price: "$15,000–40,000", gap: "30–45%", digits: "5352244",
    note: "The longest, most researched decision in healthcare. Patients read every page before booking a consult; content depth is the product.",
    q: "fertility clinic|ivf clinic|egg freezing|fertility specialist|reproductive medicine", t: "fertility|ivf|ttc", lic: 1, arch: "consult", care: MID_CARE_HI,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Cosmetic surgery & aesthetic clinics", group: "health", f: "pro", size: "mid", tkt: "$3k–20k", price: "$12,000–30,000", gap: "30–45%", digits: "5353344",
    note: "Visual, high-ticket and competitive. Procedure pages, surgeon profiles and a consult funnel that respects advertising rules are the brief.",
    q: "plastic surgeon|cosmetic surgery|aesthetic clinic|rhinoplasty|liposuction clinic", t: "plasticsurgery|aesthetics|cosmeticsurgery", lic: 1, arch: "consult", care: MID_CARE_HI,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Physiotherapy & rehab groups", group: "health", f: "pro", size: "mid", tkt: "$80–200/visit, 3–10 sites", price: "$10,000–24,000", gap: "40–55%", digits: "4353454",
    note: "Clinics that grew to several sites on one old site. Condition pages, therapist profiles and booking by location carry it.",
    q: "physiotherapy clinic|physical therapy|sports rehab|physio near me|rehabilitation center", t: "physio|physiotherapy|rehab", lic: 1, arch: "book", care: MID_CARE, smallOf: "Physical therapy & small clinics",
    fit: { US: "fits", CA: "strong", AE: "fits" },
  },
  {
    n: "Home health agencies", group: "health", f: "pro", size: "mid", tkt: "$30–45/hr, 50+ clients", price: "$10,000–22,000", gap: "45–60%", digits: "4453354",
    note: "Two buyers on one site: families looking for care, and caregivers looking for work. Recruiting pages alone justify the build.",
    q: "home health agency|home care agency|in-home care|nursing at home|caregiver services", t: "homecare|homehealth|caregivers", lic: 1, arch: "consult", care: MID_CARE, smallOf: "Home care & senior care",
    fit: { US: "strong", CA: "strong", AE: "fits" },
  },
  {
    n: "Assisted living & senior communities", group: "health", f: "pro", size: "mid", tkt: "$4k–9k/mo/resident", price: "$12,000–30,000", gap: "35–50%", digits: "5352354",
    note: "A family decision made over weeks. Floor plans, care levels, a tour booking and honest pricing ranges win the visit.",
    q: "assisted living|senior living|memory care|retirement community|independent living", t: "seniorliving|assistedliving|memorycare", lic: 1, arch: "consult", care: MID_CARE,
    fit: { US: "strong", CA: "strong", AE: "no" },
  },

  // ---------- Mid-size versions of existing categories ----------
  {
    n: "HVAC companies (multi-truck)", group: "mech", f: "mech", size: "mid", tkt: "$6k–15k installs, 10–60 techs", price: "$12,000–30,000", gap: "45–60%", digits: "5354354",
    note: "They already have a site; it is slow, has no booking and doesn't sell the maintenance plan. Sell online booking, plan sign-up and a tech-recruiting page.",
    q: "hvac company|ac repair|heating and cooling|air conditioning service|furnace replacement", t: "hvac|acrepair|heatingandcooling", lic: 1, arch: "emergency", care: MID_CARE, smallOf: "HVAC",
    fit: { US: "strong", CA: "fits", AE: "strong" },
  },
  {
    n: "Plumbing companies (multi-truck)", group: "mech", f: "mech", size: "mid", tkt: "$300–15k, 10–50 techs", price: "$10,000–25,000", gap: "45–60%", digits: "5354354",
    note: "Service-area pages for every suburb, online booking and a hiring page. They spend on ads already and feel the cost of a weak landing page.",
    q: "plumbing company|plumber|drain cleaning|water heater replacement|emergency plumber", t: "plumbing|plumber|drains", lic: 1, arch: "emergency", care: MID_CARE, smallOf: "Plumbing",
    fit: { US: "strong", CA: "fits", AE: "fits" },
  },
  {
    n: "Roofing contractors (regional)", group: "ext", f: "ext", size: "mid", tkt: "$10k–40k, multi-crew", price: "$12,000–30,000", gap: "40–55%", digits: "5353334",
    note: "Storm-driven and ad-heavy. Insurance-claim content, city pages and a lead form that routes to the right office are what they pay for.",
    q: "roofing company|roof replacement|roof repair|commercial roofing|storm damage roofing", t: "roofing|roofer|roofreplacement", lic: 1, arch: "quote", care: MID_CARE, smallOf: "Roofing",
    fit: { US: "strong", CA: "fits", AE: "no" },
  },
  {
    n: "Commercial electrical contractors", group: "b2b", f: "b2b", size: "mid", tkt: "$20k–500k/project", price: "$12,000–30,000", gap: "45–60%", digits: "5343334",
    note: "Bid lists and general contractors decide who gets asked. A capabilities page, project list and safety record get them on the list.",
    q: "commercial electrician|electrical contractor|industrial electrician|tenant improvement electrical|ev charger installation", t: "electricalcontractor|electrician|commercialelectric", lic: 1, arch: "rfq", care: MID_CARE, smallOf: "Electrical",
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Pest control (multi-route)", group: "clean", f: "clean", size: "mid", tkt: "$300–600/yr per home, 5k+ accounts", price: "$10,000–22,000", gap: "45–60%", digits: "4354354",
    note: "Recurring plans are the business. Plan sign-up with online payment and a customer portal are the software sale behind the site.",
    q: "pest control company|exterminator|termite control|commercial pest control|mosquito control", t: "pestcontrol|exterminator|termites", lic: 1, arch: "book", care: MID_CARE, smallOf: "Pest control",
    fit: { US: "strong", CA: "fits", AE: "strong" },
  },
  {
    n: "Restoration companies (multi-crew)", group: "mech", f: "mech", size: "mid", tkt: "$5k–80k/claim", price: "$12,000–28,000", gap: "40–55%", digits: "5353334",
    note: "Insurance-claim work, 24-hour lines and adjusters who check the website. Claim process pages and a referral portal for agents sell here.",
    q: "water damage restoration|fire damage restoration|mold remediation|flood cleanup|restoration company", t: "restoration|waterdamage|mitigation", lic: 1, arch: "emergency", care: MID_CARE, smallOf: "Water & fire restoration",
    fit: { US: "strong", CA: "fits", AE: "no" },
  },
  {
    n: "Moving & storage companies", group: "clean", f: "clean", size: "mid", tkt: "$1.5k–15k/move", price: "$10,000–22,000", gap: "45–60%", digits: "4344334",
    note: "Long-distance and corporate moves, storage units and a quote form that asks the right questions. The quote calculator is the upsell.",
    q: "moving company|movers|long distance movers|storage units|office movers", t: "movers|moving|storage", lic: 1, arch: "quote", care: MID_CARE, smallOf: "Moving companies",
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Design-build remodelers", group: "int", f: "int", size: "mid", tkt: "$50k–300k", price: "$12,000–30,000", gap: "35–50%", digits: "5353334",
    note: "In-house designers, project managers and crews. A process page, budget ranges and a project portfolio filter the tyre-kickers before the first meeting.",
    q: "design build remodeler|home renovation company|whole home remodel|home addition contractor|villa renovation", t: "designbuild|remodel|renovation", lic: 1, arch: "quote", care: MID_CARE, smallOf: "Kitchen & bath remodeling",
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Property management firms (500+ doors)", group: "pro", f: "pro", size: "mid", tkt: "8–12% of rent, 500+ doors", price: "$15,000–35,000", gap: "40–55%", digits: "5353354",
    note: "Owners, tenants and vendors all use the site. Owner portals, listings feeds and maintenance requests are software they will pay monthly for.",
    q: "property management company|rental management|hoa management|apartment management|property manager", t: "propertymanagement|realestate|rentals", lic: 1, arch: "consult", care: MID_CARE_HI, smallOf: "Property management companies",
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Mid-size law firms", group: "pro", f: "pro", size: "mid", tkt: "$5k–100k/matter, 10–50 lawyers", price: "$15,000–40,000", gap: "35–50%", digits: "5353244",
    note: "Practice-area pages, lawyer profiles and intake that routes to the right team. Partners care about how the firm looks to referrers.",
    q: "law firm|business lawyer|employment lawyer|family law firm|litigation attorney", t: "lawfirm|lawyer|attorney", lic: 1, arch: "consult", care: MID_CARE_HI, smallOf: "Small law firms",
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Accounting & CPA firms", group: "pro", f: "pro", size: "mid", tkt: "$2k–50k/yr per client, 10–60 staff", price: "$12,000–30,000", gap: "45–60%", digits: "5354354",
    note: "Service pages per client type, a secure document upload and recruiting. Deadline calendars make the content plan obvious.",
    q: "accounting firm|cpa firm|tax accountant|audit firm|outsourced accounting", t: "cpa|accounting|tax", lic: 1, arch: "consult", care: MID_CARE, smallOf: "Bookkeeping & tax prep",
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Car dealers & dealer groups", group: "auto", f: "auto", size: "mid", tkt: "$15k–60k/vehicle", price: "$15,000–40,000", gap: "35–50%", digits: "5353244",
    note: "Independent and used-car dealers stuck on a listings-vendor template. Inventory feeds, finance applications and trade-in forms are the build.",
    q: "used car dealer|car dealership|pre-owned cars|auto dealer|car showroom", t: "usedcars|cardealer|carsforsale", lic: 1, arch: "catalog", care: MID_CARE_HI,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Restaurant groups (3+ locations)", group: "food", f: "food", size: "mid", tkt: "$500k–5M/yr per site", price: "$10,000–25,000", gap: "45–60%", digits: "4343344",
    note: "Several concepts or sites, each with its own menu and hours. Direct ordering, reservations and private-dining enquiries replace the PDF menus.",
    q: "restaurant group|restaurants|private dining|catering restaurant|family restaurant", t: "restaurant|foodie|dining", lic: 1, arch: "menu", care: MID_CARE, smallOf: "Independent restaurants",
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Multi-location gyms & fitness clubs", group: "edu", f: "edu", size: "mid", tkt: "$50–200/mo/member, 3+ sites", price: "$10,000–25,000", gap: "40–55%", digits: "4353354",
    note: "Membership sales, class timetables per club and a trial pass. Member portals and app integrations are the recurring sale.",
    q: "gym|fitness club|health club|24 hour gym|fitness center", t: "gym|fitness|healthclub", lic: 0, arch: "enroll", care: MID_CARE, smallOf: "Independent gyms & CrossFit",
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Private schools & academies", group: "edu", f: "edu", size: "mid", tkt: "$8k–40k/yr per student", price: "$15,000–40,000", gap: "35–50%", digits: "5353354",
    note: "Admissions is the funnel: tours, open days, fees and an application portal. Parents read every page, twice.",
    q: "private school|international school|academy|montessori school|k-12 school", t: "privateschool|school|admissions", lic: 1, arch: "enroll", care: MID_CARE_HI,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Childcare centre groups", group: "edu", f: "edu", size: "mid", tkt: "$1k–2.5k/mo/child, 3+ centres", price: "$12,000–28,000", gap: "40–55%", digits: "5353354",
    note: "Waitlists per centre, tour booking and staff recruiting. Parent communication software is the obvious second sale.",
    q: "daycare center|childcare center|nursery|early learning center|preschool", t: "daycare|childcare|nursery", lic: 1, arch: "enroll", care: MID_CARE, smallOf: "Daycare & preschool",
    fit: { US: "fits", CA: "strong", AE: "strong" },
  },
  {
    n: "Boutique hotels & serviced apartments", group: "food", f: "food", size: "mid", tkt: "$150–600/night", price: "$12,000–30,000", gap: "35–50%", digits: "4353344",
    note: "Every direct booking saves an online travel agency commission. A booking engine link, room pages and local guides pay for the build fast.",
    q: "boutique hotel|serviced apartments|hotel|aparthotel|guest house", t: "boutiquehotel|hotel|staycation", lic: 1, arch: "book", care: MID_CARE_HI,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Manufacturers (20–250 staff)", group: "b2b", f: "b2b", size: "mid", tkt: "$10k–1M/order", price: "$15,000–40,000", gap: "50–65%", digits: "5453234",
    note: "Sites built a decade ago by a nephew. Capabilities, certifications, a request-for-quote with drawings and a careers page are the brief.",
    q: "manufacturer|contract manufacturing|metal fabrication company|plastic injection molding|industrial manufacturer", t: "manufacturing|madeinusa|industrial", lic: 0, arch: "rfq", care: MID_CARE,
    fit: { US: "strong", CA: "fits", AE: "fits" },
  },
  {
    n: "Distributors & wholesalers", group: "b2b", f: "b2b", size: "mid", tkt: "$5k–500k/account/yr", price: "$15,000–40,000", gap: "50–65%", digits: "5453254",
    note: "Catalogues in PDF and orders by phone. A searchable catalogue and a trade-account portal are a real software sale with monthly fees.",
    q: "wholesale distributor|wholesaler|building supply|industrial supply|trading company", t: "wholesale|distributor|b2b", lic: 0, arch: "catalog", care: MID_CARE,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Trucking fleets & 3PL", group: "b2b", f: "b2b", size: "mid", tkt: "$2k–50k/lane/mo", price: "$12,000–30,000", gap: "50–65%", digits: "4453244",
    note: "Two audiences: shippers who want capacity and drivers who want jobs. Driver recruiting alone is worth the build.",
    q: "trucking company|freight carrier|3pl warehouse|logistics company|freight forwarding", t: "trucking|logistics|3pl", lic: 1, arch: "rfq", care: MID_CARE, smallOf: "Freight, hotshot & box truck",
    fit: { US: "strong", CA: "strong", AE: "strong" },
  },
  {
    n: "Commercial general contractors", group: "b2b", f: "b2b", size: "mid", tkt: "$500k–20M/project", price: "$15,000–40,000", gap: "45–60%", digits: "5343234",
    note: "Owners and architects shortlist from portfolios and safety records. Project pages by sector and a prequalification pack are what they need.",
    q: "general contractor|commercial construction|construction company|fit-out contractor|design and build contractor", t: "construction|generalcontractor|fitout", lic: 1, arch: "rfq", care: MID_CARE,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Real estate brokerages (20+ agents)", group: "pro", f: "pro", size: "mid", tkt: "commission, 20–200 agents", price: "$15,000–40,000", gap: "30–45%", digits: "5253344",
    note: "Listings feeds, agent profile pages and lead routing. Agent recruiting is the second audience and the one owners care about most.",
    q: "real estate brokerage|real estate agency|property brokers|luxury real estate|off plan property", t: "realestate|realtor|property", lic: 1, arch: "catalog", care: MID_CARE_HI, smallOf: "Real estate teams & brokers",
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
  {
    n: "Training institutes & vocational centres", group: "edu", f: "edu", size: "mid", tkt: "$500–8k/course", price: "$10,000–25,000", gap: "40–55%", digits: "4353344",
    note: "Course catalogues, intake dates and enrolment with payment. Corporate training enquiries are the high-value second funnel.",
    q: "training institute|vocational school|professional courses|language institute|certification training", t: "training|courses|upskill", lic: 1, arch: "enroll", care: MID_CARE,
    fit: { US: "fits", CA: "fits", AE: "strong" },
  },
];

/**
 * Where the port's categories sell outside the US. Everything fits the US (the port is the US analysis) and
 * Canada unless listed; the UAE list drops trades that don't exist there (snow, basements, chimneys, pitched-roof
 * gutters, septic, breweries) and marks those the climate or the market makes strong.
 */
export const PORT_FIT: Record<string, Partial<Record<Country, Fit>>> = {
  "Snow & ice management": { CA: "strong", AE: "no" },
  "Christmas & permanent lighting": { AE: "no" },
  "Chimney sweep & repair": { CA: "strong", AE: "no" },
  "Basement finishing": { CA: "strong", AE: "no" },
  "Gutter cleaning": { AE: "no" },
  "Gutters & gutter guards": { AE: "no" },
  "Septic & sewer": { AE: "no" },
  "Well drilling & water treatment": { AE: "no" },
  "Siding & exterior trim": { AE: "no" },
  Roofing: { AE: "no" },
  "Water & fire restoration": { AE: "no" },
  "Breweries & taprooms": { AE: "no" },
  "Deck & fence staining": { AE: "no" },
  "Sod & lawn renovation": { AE: "no" },
  "Fire pits & outdoor fireplaces": { AE: "no" },
  "Notary & loan signing agents": { CA: "no", AE: "no" },
  "Independent insurance agents": { AE: "no" },
  HVAC: { AE: "strong" },
  "Air duct & dryer vent cleaning": { AE: "strong" },
  "Pool builders": { AE: "strong" },
  "Pool cleaning & service": { AE: "strong" },
  "Window tint, PPF & wraps": { AE: "strong" },
  "Pest control": { AE: "strong" },
  "Moving companies": { AE: "strong" },
  "Artificial turf install": { AE: "strong" },
  "Irrigation & sprinkler repair": { AE: "strong" },
  "Mobile detailing": { AE: "strong" },
  "Home inspectors": { AE: "strong" },
  "Immigration & document services": { CA: "strong", AE: "strong" },
  "Bookkeeping & tax prep": { AE: "strong" },
  "Real estate teams & brokers": { AE: "strong" },
  "Property management companies": { AE: "strong" },
  "Tutoring & test prep": { AE: "strong" },
  "Daycare & preschool": { CA: "strong", AE: "strong" },
  "Med spa & injectables": { AE: "strong" },
  "Home care & senior care": { CA: "strong" },
  "Physical therapy & small clinics": { CA: "strong" },
  "Kitchen & bath remodeling": { AE: "strong" },
  "Commercial janitorial": { AE: "strong" },
};
