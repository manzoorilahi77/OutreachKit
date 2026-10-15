import { describe, expect, it } from "vitest";
import { isWebsiteFilter, webHref, websiteOptions, websiteStatus } from "@/lib/leads/website";

const L = (website_found: boolean | null, website_url = "") => ({ website_found, website_url });

describe("websiteStatus", () => {
  it("is 'with' when the lead says a site was found or carries an address", () => {
    expect(websiteStatus(L(true, "https://a.example"))).toBe("with");
    expect(websiteStatus(L(true))).toBe("with");
    expect(websiteStatus(L(null, "https://a.example"))).toBe("with");
  });
  it("is 'without' only when a site was looked for and none was found", () => {
    expect(websiteStatus(L(false))).toBe("without");
  });
  it("is 'unknown' when nobody has checked yet", () => {
    expect(websiteStatus(L(null))).toBe("unknown");
    expect(websiteStatus(L(null, "   "))).toBe("unknown");
  });
});

describe("websiteOptions", () => {
  it("counts each status and drops 'not checked' when there are none", () => {
    const o = websiteOptions([L(true, "x"), L(false), L(false)], undefined);
    expect(o.map((x) => [x.v, x.count])).toEqual([["with", 1], ["without", 2]]);
  });
  it("keeps the chosen status in the list even at zero", () => {
    expect(websiteOptions([L(true, "x")], "unknown").map((x) => x.v)).toEqual(["with", "without", "unknown"]);
  });
});

describe("isWebsiteFilter", () => {
  it("accepts only the three values", () => {
    expect(isWebsiteFilter("with")).toBe(true);
    expect(isWebsiteFilter("nope")).toBe(false);
    expect(isWebsiteFilter(undefined)).toBe(false);
  });
});

describe("webHref", () => {
  it("keeps http(s) addresses and adds https:// to a bare domain", () => {
    expect(webHref("https://a.example/x")).toBe("https://a.example/x");
    expect(webHref(" www.a.example ")).toBe("https://www.a.example");
    expect(webHref("a.example/menu")).toBe("https://a.example/menu");
  });
  it("drops anything that is not a web address", () => {
    expect(webHref("javascript:alert(1)")).toBe("");
    expect(webHref("data:text/html,x")).toBe("");
    expect(webHref("not a link")).toBe("");
    expect(webHref("")).toBe("");
  });
});
