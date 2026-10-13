# Category analysis: healthcare, mid-size, Canada and the UAE

Status: **unreviewed shortlist** (2026-10-13). Every row is a planning estimate made with the Board's own method, not
researched market data. Cut, rescore or rename anything here; the data lives in `src/lib/kit/extBoard.ts` and the
Board, the Kit Console, the lead finder and the kit files all read it from there.

## How the rows were scored

The same seven factors and weights as the original Board (`src/data/weights.ts`), each 1–5:

| Factor | Weight | Read for a new category as |
|---|---|---|
| TKT | 2 | Their typical job or patient value, against our build price |
| GAP | 2 | Small: share with no real site. **Mid-size: share with a weak or dated site** (they nearly all have one) |
| ROI | 1.5 | How quickly one new job or patient pays for the build |
| DEN | 1 | How many operators a typical metro holds |
| ACC | 1 | How easy the decision maker is to reach (lower for mid-size: a manager, not the owner) |
| REC | 1.5 | Recurring revenue after the build: care plan, portal fees, content |
| CLR | 1 | How clearly they understand what a site does for them |

Score = weighted sum ÷ 50 × 100; Tier A ≥ 80, B ≥ 66, as on the Board.

**What "mid-size" means here:** roughly ten to a few hundred staff or several locations, a manager as the buyer, a site
that already exists, and a build that is a system (booking, location pages, portal, integrations) priced about
$10k–40k with a $299–999 care plan. Mid-size rows carry their own care plan (`care` in the row); small healthcare rows
carry a slightly higher care plan than their tier would give, because compliance work rides on it.

**Country fit:** `Strong` = the trade is large or under-served there, `Fits` = sells as in the US, `—` = hidden in
that country (the trade doesn't exist there or the model doesn't transfer). The same field covers the original 124
categories (`PORT_FIT` in the same file): everything fits the US and Canada unless listed; the UAE hides snow, chimney,
basement, gutter, septic, well, siding, roofing, restoration, brewery and similar trades, and marks the climate- and
expat-driven ones (HVAC, pools, tint, pest control, moving, irrigation, home inspection/snagging, tax and bookkeeping)
as strong.

## The shortlist (43)

The original's five health-adjacent categories (chiropractic, physical therapy, therapists, home care, med spa) are now
listed under **Healthcare** too; their kits are unchanged. Veterinary clinics sits in Pets.

### Healthcare, small

| Category | Family | Their job value | Build price | Gap | Factors | Score | US | CA | UAE | Why it is on the list |
|---|---|---|---|---|---|---|---|---|---|---|
| Hearing & audiology clinics | Healthcare | $2k–6k/pair | $2,000–3,500 | 30–40% | 4353444 | **77** B | Fits | Strong | Fits | Big ticket, older buyers who research before they call, and their adult children doing the searching. A free hearing test booking is the hook. |
| Speech & occupational therapy | Healthcare | $100–200/session | $2,000–3,500 | 35–45% | 3443454 | **77** B | Fits | Strong | Strong | Parents search at night, worried, and want to know who the clinic helps and what the first visit looks like. Long-running care, strong retention. |
| Dental practices | Healthcare | $150–5k/patient | $3,000–5,000 | 20–30% | 4254354 | **76** B | Fits | Strong | Strong | Most have a site from a dental marketing vendor that looks like every other one. Sell new-patient booking and treatment pages, not a first website. |
| Veterinary clinics | Pets | $100–3k | $2,500–4,000 | 20–30% | 4254354 | **76** B | Fits | Fits | Strong | Animal health with real ticket sizes. Appointment booking, wellness plans and a clear emergency page beat the template most clinics run. |
| IV therapy & wellness clinics | Healthcare | $150–400/drip | $2,000–3,500 | 35–45% | 3443444 | **74** B | Fits | Fits | Strong | Young, Instagram-first clinics with a menu of drips and no way to book one. Memberships make the care plan an easy add. |
| Orthodontists | Healthcare | $3k–8k/case | $3,000–5,000 | 15–25% | 5252344 | **73** B | Fits | Fits | Strong | Highest case value in small healthcare. Parents compare three practices on a phone; a clear treatment and payment-plan page wins the consult. |
| Dermatology & skin clinics | Healthcare | $150–3k | $2,500–4,500 | 20–30% | 4254344 | **73** B | Fits | Fits | Strong | Medical and cosmetic work under one roof, and patients who search by condition. Treatment pages and consult booking carry the build. |
| Optometry & eyewear | Healthcare | $150–800 | $2,200–3,800 | 25–35% | 3344444 | **72** B | Fits | Strong | Fits | Independents lose eye exams to chains that let you book online. Exam booking plus a frames gallery is the whole pitch. |
| Acupuncture & traditional medicine | Healthcare | $80–150/visit | $1,500–2,500 | 45–55% | 2443544 | **72** B | Fits | Strong | Fits | Solo practitioners on a booking-platform page and nothing else. Cheap to build for, quick to close, steady care-plan revenue. |
| Independent pharmacies | Healthcare | $20–200/visit | $1,800–3,000 | 30–40% | 2344454 | **71** B | Fits | Strong | Fits | Competing with chains on service, not price. Refill requests, vaccination booking and a services list are the site. |
| Podiatry & foot clinics | Healthcare | $100–3k | $2,000–3,500 | 30–40% | 3343444 | **70** B | Fits | Fits | Fits | Condition-driven searches (heel pain, ingrown nail, orthotics) and almost no condition pages. Easy specificity win. |

### Healthcare, mid-size

| Category | Family | Their job value | Build price | Gap | Factors | Score | US | CA | UAE | Why it is on the list |
|---|---|---|---|---|---|---|---|---|---|---|
| Multi-location dental groups | Healthcare | $150–5k/patient, 3–15 sites | $12,000–30,000 | 40–60% | 5353354 | **82** A | Fits | Strong | Strong | Grew by buying practices, so every location has a different site. One brand, one booking flow and a page per location is a real project with a real budget. |
| Home health agencies | Healthcare | $30–45/hr, 50+ clients | $10,000–22,000 | 45–60% | 4453354 | **82** A | Strong | Strong | Fits | Two buyers on one site: families looking for care, and caregivers looking for work. Recruiting pages alone justify the build. |
| Polyclinics & multi-specialty centres | Healthcare | $100–2k/visit | $15,000–35,000 | 40–55% | 5353353 | **80** A | Fits | Fits | Strong | Ten departments behind one generic home page. A doctor directory, department pages and booking per specialty is the brief, and it renews. |
| Physiotherapy & rehab groups | Healthcare | $80–200/visit, 3–10 sites | $10,000–24,000 | 40–55% | 4353454 | **80** A | Fits | Strong | Fits | Clinics that grew to several sites on one old site. Condition pages, therapist profiles and booking by location carry it. |
| Assisted living & senior communities | Healthcare | $4k–9k/mo/resident | $12,000–30,000 | 35–50% | 5352354 | **80** A | Strong | Strong | — | A family decision made over weeks. Floor plans, care levels, a tour booking and honest pricing ranges win the visit. |
| Cosmetic surgery & aesthetic clinics | Healthcare | $3k–20k | $12,000–30,000 | 30–45% | 5353344 | **79** B | Fits | Fits | Strong | Visual, high-ticket and competitive. Procedure pages, surgeon profiles and a consult funnel that respects advertising rules are the brief. |
| Urgent care & walk-in clinics | Healthcare | $150–400/visit | $10,000–25,000 | 35–50% | 4353354 | **78** B | Strong | Strong | Fits | Patients choose on wait time and distance from a phone. Online check-in, live wait times and location pages are what they buy. |
| Fertility & IVF clinics | Healthcare | $12k–25k/cycle | $15,000–40,000 | 30–45% | 5352244 | **75** B | Fits | Fits | Strong | The longest, most researched decision in healthcare. Patients read every page before booking a consult; content depth is the product. |
| Diagnostic imaging & labs | Healthcare | $100–2k/scan | $10,000–25,000 | 40–55% | 4343344 | **72** B | Fits | Fits | Strong | Referral-driven, but self-pay patients now shop on price and appointment time. Test menus, prep instructions and booking close the gap. |

### Mid-size, other families

| Category | Family | Their job value | Build price | Gap | Factors | Score | US | CA | UAE | Why it is on the list |
|---|---|---|---|---|---|---|---|---|---|---|
| HVAC companies (multi-truck) | Mechanical & Emergency | $6k–15k installs, 10–60 techs | $12,000–30,000 | 45–60% | 5354354 | **84** A | Strong | Fits | Strong | They already have a site; it is slow, has no booking and doesn't sell the maintenance plan. Sell online booking, plan sign-up and a tech-recruiting page. |
| Plumbing companies (multi-truck) | Mechanical & Emergency | $300–15k, 10–50 techs | $10,000–25,000 | 45–60% | 5354354 | **84** A | Strong | Fits | Fits | Service-area pages for every suburb, online booking and a hiring page. They spend on ads already and feel the cost of a weak landing page. |
| Accounting & CPA firms | Professional Services | $2k–50k/yr per client, 10–60 staff | $12,000–30,000 | 45–60% | 5354354 | **84** A | Fits | Fits | Strong | Service pages per client type, a secure document upload and recruiting. Deadline calendars make the content plan obvious. |
| Distributors & wholesalers | Commercial & B2B | $5k–500k/account/yr | $15,000–40,000 | 50–65% | 5453254 | **84** A | Fits | Fits | Strong | Catalogues in PDF and orders by phone. A searchable catalogue and a trade-account portal are a real software sale with monthly fees. |
| Property management firms (500+ doors) | Professional Services | 8–12% of rent, 500+ doors | $15,000–35,000 | 40–55% | 5353354 | **82** A | Fits | Fits | Strong | Owners, tenants and vendors all use the site. Owner portals, listings feeds and maintenance requests are software they will pay monthly for. |
| Private schools & academies | Fitness, Kids & Education | $8k–40k/yr per student | $15,000–40,000 | 35–50% | 5353354 | **82** A | Fits | Fits | Strong | Admissions is the funnel: tours, open days, fees and an application portal. Parents read every page, twice. |
| Childcare centre groups | Fitness, Kids & Education | $1k–2.5k/mo/child, 3+ centres | $12,000–28,000 | 40–55% | 5353354 | **82** A | Fits | Strong | Strong | Waitlists per centre, tour booking and staff recruiting. Parent communication software is the obvious second sale. |
| Pest control (multi-route) | Cleaning & Recurring | $300–600/yr per home, 5k+ accounts | $10,000–22,000 | 45–60% | 4354354 | **80** A | Strong | Fits | Strong | Recurring plans are the business. Plan sign-up with online payment and a customer portal are the software sale behind the site. |
| Multi-location gyms & fitness clubs | Fitness, Kids & Education | $50–200/mo/member, 3+ sites | $10,000–25,000 | 40–55% | 4353354 | **78** B | Fits | Fits | Strong | Membership sales, class timetables per club and a trial pass. Member portals and app integrations are the recurring sale. |
| Manufacturers (20–250 staff) | Commercial & B2B | $10k–1M/order | $15,000–40,000 | 50–65% | 5453234 | **78** B | Strong | Fits | Fits | Sites built a decade ago by a nephew. Capabilities, certifications, a request-for-quote with drawings and a careers page are the brief. |
| Mid-size law firms | Professional Services | $5k–100k/matter, 10–50 lawyers | $15,000–40,000 | 35–50% | 5353244 | **77** B | Fits | Fits | Strong | Practice-area pages, lawyer profiles and intake that routes to the right team. Partners care about how the firm looks to referrers. |
| Car dealers & dealer groups | Automotive | $15k–60k/vehicle | $15,000–40,000 | 35–50% | 5353244 | **77** B | Fits | Fits | Strong | Independent and used-car dealers stuck on a listings-vendor template. Inventory feeds, finance applications and trade-in forms are the build. |
| Trucking fleets & 3PL | Commercial & B2B | $2k–50k/lane/mo | $12,000–30,000 | 50–65% | 4453244 | **77** B | Strong | Strong | Strong | Two audiences: shippers who want capacity and drivers who want jobs. Driver recruiting alone is worth the build. |
| Roofing contractors (regional) | Exterior Home | $10k–40k, multi-crew | $12,000–30,000 | 40–55% | 5353334 | **76** B | Strong | Fits | — | Storm-driven and ad-heavy. Insurance-claim content, city pages and a lead form that routes to the right office are what they pay for. |
| Restoration companies (multi-crew) | Mechanical & Emergency | $5k–80k/claim | $12,000–28,000 | 40–55% | 5353334 | **76** B | Strong | Fits | — | Insurance-claim work, 24-hour lines and adjusters who check the website. Claim process pages and a referral portal for agents sell here. |
| Design-build remodelers | Interior & Remodel | $50k–300k | $12,000–30,000 | 35–50% | 5353334 | **76** B | Fits | Fits | Strong | In-house designers, project managers and crews. A process page, budget ranges and a project portfolio filter the tyre-kickers before the first meeting. |
| Boutique hotels & serviced apartments | Food & Hospitality | $150–600/night | $12,000–30,000 | 35–50% | 4353344 | **75** B | Fits | Fits | Strong | Every direct booking saves an online travel agency commission. A booking engine link, room pages and local guides pay for the build fast. |
| Real estate brokerages (20+ agents) | Professional Services | commission, 20–200 agents | $15,000–40,000 | 30–45% | 5253344 | **75** B | Fits | Fits | Strong | Listings feeds, agent profile pages and lead routing. Agent recruiting is the second audience and the one owners care about most. |
| Training institutes & vocational centres | Fitness, Kids & Education | $500–8k/course | $10,000–25,000 | 40–55% | 4353344 | **75** B | Fits | Fits | Strong | Course catalogues, intake dates and enrolment with payment. Corporate training enquiries are the high-value second funnel. |
| Commercial electrical contractors | Commercial & B2B | $20k–500k/project | $12,000–30,000 | 45–60% | 5343334 | **73** B | Fits | Fits | Strong | Bid lists and general contractors decide who gets asked. A capabilities page, project list and safety record get them on the list. |
| Restaurant groups (3+ locations) | Food & Hospitality | $500k–5M/yr per site | $10,000–25,000 | 45–60% | 4343344 | **72** B | Fits | Fits | Strong | Several concepts or sites, each with its own menu and hours. Direct ordering, reservations and private-dining enquiries replace the PDF menus. |
| Moving & storage companies | Cleaning & Recurring | $1.5k–15k/move | $10,000–22,000 | 45–60% | 4344334 | **71** B | Fits | Fits | Strong | Long-distance and corporate moves, storage units and a quote form that asks the right questions. The quote calculator is the upsell. |
| Commercial general contractors | Commercial & B2B | $500k–20M/project | $15,000–40,000 | 45–60% | 5343234 | **71** B | Fits | Fits | Strong | Owners and architects shortlist from portfolios and safety records. Project pages by sector and a prequalification pack are what they need. |

## Considered and left out

- **Hospitals and hospital systems**: procurement-led, agency-held, long cycles. Not a cold-DM sale.
- **Nursing homes (skilled nursing)**: heavily regulated advertising and family complaints risk; assisted living covers the sale.
- **Telehealth startups**: they build in-house.
- **Medical device distributors**: covered by *Distributors & wholesalers*.
- **Franchise brands (HQ)**: the buyer is a franchisor with an agency; sell to franchisees as small businesses instead.
- **Banks, insurers, utilities**: enterprise procurement.
- **Separate Canada- or UAE-only categories**: none needed. The same trades sell there; country fit hides or highlights them.

## Open calls for the owner

1. Mid-size build prices ($10k–40k) and care plans ($299–999) are planning figures. Confirm them against the first two proposals.
2. The UAE "Strong" marks come from the climate, expat demand and how the trades are organised, not from counts. Spot-check five before a UAE push.
3. Exchange rates default to 1 USD = 1.37 CAD and 3.67 AED. Admins change them in Settings.
4. The 43 kit files are `unreviewed`, like the original 124.
