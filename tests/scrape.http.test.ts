import { describe, expect, it } from "vitest";
import { createSseParser, parseRunRequest, sameOrigin, sseFrame } from "@/lib/scrape/http";
import { randomDelayMs } from "@/lib/scrape/scraper";
import type { RunEvent } from "@/lib/scrape/types";

describe("run request", () => {
  const ok = { category: "Fencing & gates", state: "tx", city: "  Fort   Worth ", limit: 50 };
  it("accepts a console category, a state, a city and one of the four limits", () => {
    expect(parseRunRequest(ok)).toEqual({ ok: true, value: { category: "Fencing & gates", state: "TX", city: "Fort Worth", limit: 50 } });
  });
  it("rejects anything else", () => {
    expect(parseRunRequest(null).ok).toBe(false);
    expect(parseRunRequest({ ...ok, category: "Made-up category" }).ok).toBe(false);
    expect(parseRunRequest({ ...ok, state: "ZZ" }).ok).toBe(false);
    expect(parseRunRequest({ ...ok, city: "" }).ok).toBe(false);
    expect(parseRunRequest({ ...ok, city: "Dallas<script>" }).ok).toBe(false);
    expect(parseRunRequest({ ...ok, limit: 60 }).ok).toBe(false);
    expect(parseRunRequest({ ...ok, limit: "50" }).ok).toBe(false);
  });
});

describe("origin check", () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });
  it("lets this site's pages and header-less callers in, and refuses other sites", () => {
    expect(sameOrigin(h({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
    expect(sameOrigin(h({ host: "localhost:3000" }))).toBe(true);
    expect(sameOrigin(h({ origin: "https://evil.example", host: "localhost:3000" }))).toBe(false);
    expect(sameOrigin(h({ origin: "not a url", host: "localhost:3000" }))).toBe(false);
  });
});

describe("progress stream", () => {
  const events: RunEvent[] = [
    { type: "status", message: "Searching…" },
    { type: "progress", found: 40, checked: 23, saved: 7, withWebsite: 5, withoutWebsite: 2, skippedDuplicate: 0, unreadable: 0, leadsRefused: 0, savedToday: 7, limit: 20, message: "Checked 23 · saved 7 · with website 5 · without website 2" },
    { type: "failed", message: "Can't reach MySQL." },
  ];
  it("round-trips events, even when a frame is split across chunks", () => {
    const wire = events.map(sseFrame).join("");
    const parse = createSseParser();
    const got: RunEvent[] = [];
    for (let i = 0; i < wire.length; i += 7) got.push(...parse(wire.slice(i, i + 7)));
    expect(got).toEqual(events);
  });
  it("skips a malformed frame instead of failing", () => {
    expect(createSseParser()("data: {oops\n\nevent: x\ndata: {\"type\":\"status\",\"message\":\"ok\"}\n\n")).toEqual([{ type: "status", message: "ok" }]);
  });
});

describe("pause between listings", () => {
  it("is between 2 and 5 seconds", () => {
    expect(randomDelayMs(undefined, undefined, () => 0)).toBe(2000);
    expect(randomDelayMs(undefined, undefined, () => 0.5)).toBe(3500);
    expect(randomDelayMs(undefined, undefined, () => 0.999999)).toBeLessThanOrEqual(5000);
    for (let i = 0; i < 200; i++) {
      const ms = randomDelayMs();
      expect(ms).toBeGreaterThanOrEqual(2000);
      expect(ms).toBeLessThanOrEqual(5000);
    }
  });
});
