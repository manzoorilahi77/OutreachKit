// Extracted verbatim from docs/source/territory-desk.html by scripts/extract-data.ts.
// Do not edit by hand: run `pnpm extract:data`, and `pnpm parity` will confirm it still matches.

import type { FamKey, Family } from "./types";

export const FAM: Record<FamKey, Family> = {
  out: {
    l: "Outdoor & Hardscape",
    src: [
      "Instagram hashtags + location tags",
      "Google Maps",
      "Facebook local groups",
      "Nextdoor recommendation threads",
      "County permit records",
      "Supply-house follower lists (lumber, stone, fence, turf)",
    ],
    bp: [
      "A before/after slider on every project — this category lives or dies on visual proof",
      "Material and style pages (cedar vs vinyl, stamped vs broom finish) — these are the searches customers actually type",
      "A financing block if they offer it; $10k backyard jobs get financed",
      "Seasonal banner slot you swap four times a year",
    ],
    up: [
      [
        "Photo & drone day",
        "$600–1,500",
        "One shoot on a finished job gives them a year of content and gives you a portfolio piece",
      ],
      [
        "Google Business Profile management",
        "$200–400/mo",
        "Weekly project photos on the profile is what makes them show up in the Maps 3-pack",
      ],
      [
        "Seasonal campaign",
        "$300–600 per push",
        "Spring backyard season and autumn pre-winter repair are their two revenue spikes",
      ],
    ],
    season: "Spring through early autumn is peak. Pitch in January and February when they are quiet, bored, and thinking about next season.",
    pitch: "\"Your last six jobs on Instagram are better work than the company ranking first in [City] — they just have a website and you don't.\"",
  },
  ext: {
    l: "Exterior Home",
    src: [
      "Google Maps",
      "Instagram + Facebook",
      "Nextdoor",
      "HOA and neighbourhood Facebook groups",
      "State contractor licence registry",
      "Storm and hail damage reports",
    ],
    bp: [
      "A damage or problem gallery so homeowners can self-diagnose before they call",
      "Insurance-claim explainer page where the category involves claims",
      "Warranty terms stated plainly on the home page",
      "Financing and payment options block",
    ],
    up: [
      [
        "Review generation system",
        "$99–249/mo",
        "Exterior work is chosen almost entirely on review count",
      ],
      [
        "Google Local Services Ads",
        "$500–1,000/mo + spend",
        "Licence-verified badge converts hard in this family",
      ],
      [
        "Seasonal / storm-response landing pages",
        "$400–800 each",
        "Built once, deployed the week weather hits",
      ],
    ],
    season: "Weather-driven. Build the relationship in the off-season so you are already their web person when the storm comes.",
    pitch: "\"Someone in [City] is searching for this right now, and the four companies they'll find all bought their way there. You're not on the list.\"",
  },
  int: {
    l: "Interior & Remodel",
    src: [
      "Instagram + Pinterest",
      "Houzz",
      "Google Maps",
      "Facebook groups",
      "Realtor and interior-designer referral networks",
      "Building permit records",
    ],
    bp: [
      "Room-by-room portfolio, not one undifferentiated gallery",
      "A realistic budget-range page — this is the number one search and almost nobody publishes it",
      "Process timeline showing weeks, not vague promises",
      "Designer and trade partner credits",
    ],
    up: [
      [
        "Photo day + 3D renders",
        "$800–2,000",
        "Renders close remodel jobs and they cannot make them themselves",
      ],
      [
        "Pinterest & Instagram content plan",
        "$300–800/mo",
        "This is where remodel customers genuinely start",
      ],
      [
        "Lead-nurture email sequence",
        "$150–400/mo",
        "Remodel decisions take three to nine months; nobody follows up that long by hand",
      ],
    ],
    season: "Steadier than outdoor work. Autumn and winter interior jobs backfill their outdoor down-season.",
    pitch: "\"Every remodel customer in [City] Googles a budget range before they call anyone. Right now they can't find yours.\"",
  },
  mech: {
    l: "Mechanical & Emergency",
    src: [
      "Google Maps",
      "State licence board lookup",
      "Local Services Ads listings",
      "Facebook groups",
      "Property manager and realtor networks",
    ],
    bp: [
      "Emergency banner with a tap-to-call number pinned to the top of every page",
      "Same-day / 24-hour availability stated in the headline",
      "Service-plan or membership sign-up page — the recurring product they already sell",
      "Brands serviced and certifications, listed explicitly",
    ],
    up: [
      [
        "Missed-call text-back",
        "$99–199/mo",
        "They lose emergency jobs every week to a call they couldn't take",
      ],
      [
        "Google Local Services Ads",
        "$500–1,000/mo + spend",
        "Highest-intent traffic in this family, and licence-gated so it is hard to fake",
      ],
      [
        "Maintenance-plan campaign",
        "$200–400/mo",
        "Turning one-off calls into memberships is worth more to them than any website",
      ],
    ],
    season: "Heat waves, cold snaps and first-freeze weeks. Their web presence matters most in exactly the week they are too busy to think about it.",
    pitch: "\"When someone's water heater fails at 9pm in [City], they search and they call the first three results. You aren't one of them.\"",
  },
  clean: {
    l: "Cleaning & Recurring",
    src: [
      "Google Maps",
      "Facebook local groups",
      "Nextdoor",
      "Property management and realtor networks",
      "Commercial park and office directories",
      "Chamber of commerce member lists",
    ],
    bp: [
      "Instant pricing or a bed/bath calculator — the single biggest conversion lift in this family",
      "Online booking with real available slots",
      "Recurring plan tiers (weekly / biweekly / monthly) with prices",
      "Trust block: background checks, insurance, supplies, guarantee",
    ],
    up: [
      [
        "Booking system setup",
        "$300–800 + $50/mo",
        "Instant booking is the product; the site is the wrapper",
      ],
      [
        "Recurring-plan campaign",
        "$200–400/mo",
        "Converting one-off cleans to subscriptions is their whole margin",
      ],
      [
        "Hiring page + applicant flow",
        "$400–900",
        "Staffing is their hardest problem, often a faster first sale than marketing",
      ],
    ],
    season: "Spring cleaning, pre-holiday, and move-out season. Commercial contracts renew on fiscal-year boundaries — pitch in the two months before.",
    pitch: "\"Two clicks to a booked, priced clean beats a phone tag every time. Right now a customer has to call and wait.\"",
  },
  auto: {
    l: "Automotive",
    src: [
      "Instagram (heavily visual)",
      "Google Maps",
      "Car meet and enthusiast Facebook groups",
      "YouTube and TikTok local searches",
      "Dealership and body-shop referral networks",
    ],
    bp: [
      "Vehicle-specific gallery filterable by make and model",
      "Transparent package pricing tiers",
      "Online booking with slot availability",
      "Warranty and product/brand certifications",
    ],
    up: [
      [
        "Booking + deposit system",
        "$300–800 + $50/mo",
        "No-shows are their biggest loss; a deposit fixes it",
      ],
      [
        "Short-form video package",
        "$500–1,200",
        "Reels of the work are how this whole category sells",
      ],
      ["Review generation", "$99–249/mo", "Enthusiast buyers read every review before booking"],
    ],
    season: "Spring detail season and pre-winter protection. Show season for wraps and paint protection.",
    pitch: "\"Your work is on Instagram, but a customer who wants to book has nowhere to land and no way to pay a deposit.\"",
  },
  care: {
    l: "Personal Care & Wellness",
    src: [
      "Instagram",
      "Google Maps",
      "Booking-platform directories",
      "Local Facebook groups",
      "Salon suite and studio buildings — walk the building",
    ],
    bp: [
      "Booking button above the fold, on every page, on every device",
      "Full service menu with real prices",
      "Practitioner bios with credentials and photographs",
      "Policies stated up front: cancellation, deposits, aftercare",
      "Gift card purchase where relevant",
    ],
    up: [
      [
        "Booking platform setup",
        "$300–800 + $50/mo",
        "Often the real sale — some in this family need booking more than a website",
      ],
      [
        "Review + rebooking automation",
        "$99–249/mo",
        "Retention is the entire economics of this family",
      ],
      [
        "Content and photography retainer",
        "$300–800/mo",
        "They need fresh images constantly and hate producing them",
      ],
    ],
    season: "Wedding season, holidays, and New Year. Book-out weeks are when they feel the pain of a bad system.",
    pitch: "\"Someone found you on Instagram at 11pm and wanted to book. There was nowhere to click.\"",
  },
  food: {
    l: "Food & Hospitality",
    src: [
      "Instagram",
      "Google Maps",
      "Delivery-platform listings",
      "Event and wedding vendor directories",
      "Farmers market and food-hall vendor lists",
      "Local food blogger tags",
    ],
    bp: [
      "Menu as real text, never a PDF and never a photo of a menu",
      "Hours and location above the fold, matching the Google profile exactly",
      "Order / reserve / enquire button in the header",
      "Catering and private event enquiry form with headcount and date",
    ],
    up: [
      [
        "Online ordering setup",
        "$400–1,000 + $50/mo",
        "Commission-free ordering saves them more than your fee costs",
      ],
      [
        "Google Business Profile + photo management",
        "$200–400/mo",
        "Food discovery is almost entirely Maps and Instagram",
      ],
      [
        "Catering lead funnel",
        "$400–900 + $150/mo",
        "Catering is the high-margin line most of them under-sell",
      ],
    ],
    season: "Holiday catering, graduation, and wedding season. Restaurants are cash-poor — sell the catering funnel, not a vanity site.",
    pitch: "\"Your catering is the profitable half of the business and there's no way to enquire about it online.\"",
  },
  event: {
    l: "Events & Creative",
    src: [
      "Instagram",
      "Wedding and event vendor directories",
      "Venue preferred-vendor lists",
      "Facebook event and planning groups",
      "Bridal show exhibitor lists",
    ],
    bp: [
      "Portfolio organised by event type, with real client names where permitted",
      "Package pricing with a genuine starting-from figure",
      "Availability calendar or date-check form",
      "Testimonials from couples and planners, with dates",
      "Downloadable pricing guide behind a name-and-email form",
    ],
    up: [
      [
        "Enquiry-to-booking automation",
        "$400–1,200 + $75/mo",
        "Event enquiries die in inboxes; automated follow-up recovers real bookings",
      ],
      [
        "SEO for venue and city terms",
        "$600–1,500/mo",
        "\"[venue name] photographer\" is the highest-intent search in this family",
      ],
      [
        "Preferred-vendor outreach kit",
        "$300–700",
        "Getting on venue lists is worth more than any advertising they can buy",
      ],
    ],
    season: "Booking happens 6–14 months ahead of the event. Their quiet season is exactly when they should be building — and when you should be pitching.",
    pitch: "\"Couples are told to check three vendors' websites. You're the one they can't check.\"",
  },
  edu: {
    l: "Fitness, Kids & Education",
    src: [
      "Google Maps",
      "Facebook parent groups",
      "Nextdoor",
      "School and PTA newsletters",
      "Community centre and rec-league directories",
    ],
    bp: [
      "Trial-class or free-week offer as the primary call to action",
      "Class schedule and pricing published plainly — hiding prices costs them enrolments",
      "Instructor bios, certifications and background checks",
      "Parent FAQ: ages, safety, what to bring, what it costs",
      "Enrolment or waitlist form, not just a phone number",
    ],
    up: [
      [
        "Lead-nurture sequence for trial-to-member",
        "$150–400/mo",
        "Their trials leak badly and nobody follows up",
      ],
      [
        "Google + Facebook local ads",
        "$500–1,000/mo + spend",
        "Enrolment is seasonal and ads work when timed to it",
      ],
      ["Parent review campaign", "$99–249/mo", "Parents choose on reviews above all else"],
    ],
    season: "Enrolment spikes in August/September and January. Pitch six to eight weeks before each.",
    pitch: "\"Parents in [City] compare three schools in one evening on a phone. Two have schedules and prices online. You have a phone number.\"",
  },
  pet: {
    l: "Pets",
    src: [
      "Instagram",
      "Google Maps",
      "Facebook pet and breed groups",
      "Nextdoor",
      "Veterinary clinic referral networks",
      "Rescue and shelter partner lists",
    ],
    bp: [
      "Online booking with real availability — pet owners book at night",
      "Service and breed-specific pricing",
      "Staff bios and safety, insurance and certification details",
      "Photo gallery of actual client pets, with permission",
      "Vaccination and policy requirements stated clearly",
    ],
    up: [
      ["Booking + deposit system", "$300–800 + $50/mo", "Cuts no-shows and fills quiet weekdays"],
      [
        "Review automation",
        "$99–249/mo",
        "Pet owners are the most review-driven customers there are",
      ],
      [
        "Holiday-boarding campaign",
        "$200–500 per push",
        "Boarding sells out at Thanksgiving and Christmas; ads pay for themselves",
      ],
    ],
    season: "Holiday boarding peaks and spring shedding season. Grooming is steady year-round.",
    pitch: "\"Someone's looking for a groomer at 10pm with a dog on their lap. Every competitor has a booking button.\"",
  },
  b2b: {
    l: "Commercial & B2B",
    src: [
      "Google Maps",
      "Chamber of commerce member lists",
      "Industrial park and business directories",
      "LinkedIn local company search",
      "Trade association member rosters",
      "State procurement and bid portals",
    ],
    bp: [
      "Capabilities page — equipment, tolerances, materials, certifications, capacity",
      "Request-for-quote form with file upload",
      "Named client logos and case studies with figures",
      "Certifications, bonding, insurance and safety record",
      "Service-area and response-time commitments",
    ],
    up: [
      [
        "RFQ pipeline and CRM setup",
        "$400–1,200 + $75/mo",
        "B2B quotes are worth thousands and they track them on paper",
      ],
      [
        "LinkedIn + email outreach system",
        "$400–900/mo",
        "Their buyers are procurement managers, not homeowners",
      ],
      [
        "Bid and proposal template kit",
        "$500–1,200",
        "Wins contracts directly — the easiest ROI story you will ever tell",
      ],
    ],
    season: "Fiscal-year budget cycles and contract renewal windows. Sell in the quarter before a renewal, not after.",
    pitch: "\"A facilities manager just got told to find three vendors. You're not findable, so you're not one of the three.\"",
  },
  pro: {
    l: "Professional Services",
    src: [
      "Google Maps",
      "State licensing and professional board directories",
      "LinkedIn local search",
      "Chamber of commerce and BNI groups",
      "Professional association directories",
      "Referral partner networks",
    ],
    bp: [
      "Credentials, licences and years of practice above the fold",
      "Plain-language explanation of who they help and who they don't",
      "Fee structure or at least a genuine range",
      "Consultation booking with a real calendar",
      "Privacy, confidentiality and compliance statements",
    ],
    up: [
      [
        "Consultation booking + intake forms",
        "$400–900 + $75/mo",
        "Intake is their bottleneck and it is all still on paper",
      ],
      ["Content and authority SEO", "$600–1,500/mo", "Trust-based buying rewards depth over ads"],
      [
        "Referral partner landing pages",
        "$300–700 each",
        "Most of their business is referred; give the referrer something to send",
      ],
    ],
    season: "Tax season, open enrolment, school year, fiscal year-end — every one of these has a fixed calendar you can plan against.",
    pitch: "\"Your clients are referred, then they Google you before calling. Right now that search decides against you.\"",
  },
};
