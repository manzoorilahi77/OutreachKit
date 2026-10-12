// Everything that depends on how Google Maps lays out its page lives in this file. When Maps changes and a run reports
// "could not read the listing" or finds nothing, this is the only file to fix. Last checked against Maps on 2026-10-09.
// The page-reading parts use the plain CSS subset that src/lib/scrape/html.ts understands, so tests can run them on saved HTML.

export const SEL = {
  // ---- search results (the left-hand list)
  feed: 'div[role="feed"]',
  card: 'div[role="article"]',
  cardLink: 'a[href*="/maps/place/"]',
  /** The "Website" button on a result card. Its absence proves nothing (some cards omit it), so those listings are opened. */
  cardWebsite: 'a[data-value="Website"]',
  /** The feed's last line, in English (the search URL asks for hl=en). */
  endOfList: "reached the end of the list",

  // ---- one listing (the side panel)
  panel: 'div[role="main"]',
  name: 'h1.DUwDvf, div[role="main"] h1',
  /** Any of these showing means the panel's contact rows have rendered. */
  panelReady: '[data-item-id="address"], [data-item-id="authority"], [data-item-id^="phone:tel:"], [data-item-id="oloc"]',
  category: "button.DkEaL",
  ratingValue: '.F7nice span[aria-hidden="true"]',
  ratingLabel: '[role="img"][aria-label$="stars"], [role="img"][aria-label$="stars "]',
  /** Review count, when Maps shows one: an aria-label such as "212 reviews". */
  reviewLabel: '[aria-label$="reviews"], [aria-label$="review"]',
  ratingBlock: ".F7nice",
  address: '[data-item-id="address"]',
  phone: '[data-item-id^="phone:tel:"]',
  /** The "Website" row. If this exists, the listing has a website. */
  website: 'a[data-item-id="authority"]',
  /** Appointment / booking / order rows ("Open booking link"). */
  actions: 'a[data-item-id^="action:"]',
  links: "a[href]",
} as const;

/** Blocks Maps can show instead of results. Checked after every navigation; a hit ends the run. */
export const BLOCK = {
  urlParts: ["/sorry/", "consent.google.com", "consent.youtube.com"],
  captchaFrame: 'iframe[src*="recaptcha"], iframe[title*="reCAPTCHA"]',
  /** Lower-case phrases that appear on Google's "unusual traffic" page. */
  textPhrases: ["unusual traffic from your computer network", "our systems have detected unusual traffic", "i'm not a robot", "confirm you're not a robot"],
  /** Buttons tried once, with a normal click, on a consent page (reject first, as the less invasive choice). */
  consentButtons: ['button[aria-label="Reject all"]', 'button:has-text("Reject all")', 'button[aria-label="Accept all"]', 'button:has-text("Accept all")'],
} as const;
