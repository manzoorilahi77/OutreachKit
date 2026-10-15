import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseHtml, selectAll } from "@/lib/scrape/html";
import { parseCards, parseListing } from "@/lib/scrape/parseListing";
import { detectBlock } from "@/lib/scrape/blocks";
import { placeKey } from "@/lib/scrape/placeKey";

const fixture = (name: string) => readFileSync(`tests/fixtures/maps/${name}`, "utf8");

describe("listing parser (saved Maps panels)", () => {
  it("reads a listing with a phone and no website", () => {
    const l = parseListing(fixture("no-website.html"))!;
    expect(l).toMatchObject({
      name: "Lone Star Roof Pros",
      phone: "+1 214-555-0147",
      address: "1200 Example Ave Ste 4, Dallas, TX 75201, United States",
      mapsCategory: "Roofing contractor",
      rating: 4.8,
      hasWebsite: false,
      websiteUrl: "",
      websiteSource: null,
      email: "",
      facebookUrl: "",
      instagramUrl: "",
    });
    expect(l.reviewCount).toBeNull(); // this panel showed no count
    expect(l.otherLinks).toEqual([]);
  });

  it("reads a listing with an address only", () => {
    const l = parseListing(fixture("no-website-no-phone.html"))!;
    expect(l).toMatchObject({ name: "Gutter Works Dallas", phone: "", rating: 4.9, hasWebsite: false });
    expect(l.address).toContain("88 Sample St #2");
  });

  it("sees the Website row", () => {
    const l = parseListing(fixture("website.html"))!;
    expect(l.name).toBe("Summit Roofing");
    expect(l.hasWebsite).toBe(true);
    expect(l.websiteSource).toBe("website");
    expect(l.websiteUrl).toContain("summitroofing.example");
  });

  it("treats a booking link on the business's own domain as a website", () => {
    const l = parseListing(fixture("booking-link-own-site.html"))!;
    expect(l.name).toBe("Prairie Roofing Co");
    expect(l.hasWebsite).toBe(true);
    expect(l.websiteSource).toBe("booking-link");
    expect(l.websiteUrl).toBe("https://www.prairieroofing.example/contact/");
    expect(l.phone).toBe("+1 972-555-0188");
  });

  it("collects email, socials, booking and other links (synthetic markup)", () => {
    const l = parseListing(fixture("no-website-socials.synthetic.html"))!;
    expect(l.hasWebsite).toBe(false); // the only action link is a third-party booking page
    expect(l.reviewCount).toBe(212);
    expect(l.email).toBe("hello@lonestarroofpros.example");
    expect(l.facebookUrl).toBe("https://www.facebook.com/lonestarroofpros");
    expect(l.instagramUrl).toBe("https://www.instagram.com/lonestar_roofpros/?hl=en"); // unwrapped from google.com/url?q=
    expect(l.otherLinks.map((o) => o.label)).toEqual(["Booking: calendly.com", "Yelp"]);
  });

  it("reads the WhatsApp number from a WhatsApp link, and keeps it out of the other links (synthetic markup)", () => {
    expect(parseListing(fixture("no-website-socials.synthetic.html"))!.whatsapp).toBe("12145550147");
    expect(parseListing(fixture("no-website.html"))!.whatsapp).toBe("");
  });

  it("returns null for a page with no listing name", () => {
    expect(parseListing("<div role=main><p>Results</p></div>")).toBeNull();
  });

  it("does not follow or fetch anything: the parser takes a string", () => {
    expect(parseListing.length).toBe(1);
  });
});

describe("result cards", () => {
  const cards = parseCards(fixture("feed-cards.html"));
  it("lists every card with its link and name", () => {
    expect(cards.map((c) => c.name)).toEqual(["Summit Roofing", "Lone Star Roof Pros", "Gutter Works Dallas"]);
  });
  it("notes which cards show a Website button", () => {
    expect(cards.map((c) => c.hasWebsiteButton)).toEqual([true, false, false]);
  });
  it("gives each card a distinct duplicate key", () => {
    const keys = cards.map((c) => placeKey(c.href));
    expect(keys).toEqual(["fid:0x1111111111111111:0x2222222222222222", "fid:0x3333333333333333:0x4444444444444444", "fid:0x5555555555555555:0x6666666666666666"]);
  });
});

describe("the tiny HTML reader", () => {
  const root = parseHtml(`<div class="a b" id="x"><p data-k="one two">Hi &amp; <b>there</b></p><ul><li><a href="/1">1</a></li></ul><a href="/2">2</a></div>`);
  it("matches class, id and attribute selectors", () => {
    expect(selectAll(root, "div.a.b#x")).toHaveLength(1);
    expect(selectAll(root, '[data-k="one two"]')).toHaveLength(1);
    expect(selectAll(root, "[data-k^=one], [data-k$=two]")).toHaveLength(1);
    expect(selectAll(root, "[data-k*=e]")).toHaveLength(1);
  });
  it("matches descendant and child combinators", () => {
    expect(selectAll(root, "div a")).toHaveLength(2);
    expect(selectAll(root, "li > a")).toHaveLength(1);
    expect(selectAll(root, "div > a")).toHaveLength(1);
  });
  it("copes with unclosed tags, void tags and script bodies", () => {
    const r = parseHtml(`<div><p>one<p>two<br><img src=x><script>if (a < b) {}</script><span>ok</span></div>`);
    expect(selectAll(r, "span")).toHaveLength(1);
    expect(selectAll(r, "script")).toHaveLength(1);
  });
});

describe("blocked pages", () => {
  it("stops on a CAPTCHA page", () => {
    expect(detectBlock({ url: "https://www.google.com/sorry/index?continue=x", text: "" })?.code).toBe("captcha");
    expect(detectBlock({ url: "https://www.google.com/maps", text: "Our systems have detected unusual traffic from your computer network." })?.code).toBe("captcha");
    expect(detectBlock({ url: "https://www.google.com/maps", text: "", hasCaptchaFrame: true })?.code).toBe("captcha");
  });
  it("stops on a consent wall", () => {
    expect(detectBlock({ url: "https://consent.google.com/m?continue=x", text: "Before you continue" })?.code).toBe("consent");
  });
  it("lets a normal page through", () => {
    expect(detectBlock({ url: "https://www.google.com/maps/search/Roofers", text: "Results Roofing contractor 4.9" })).toBeNull();
  });
});
