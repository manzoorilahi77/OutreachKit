import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { patchSnapshot } from "../golden/corrections";
import { FIXTURES } from "../golden/fixtures";
import { generateKit } from "@/lib/kit/generate";
import { kitText } from "@/lib/kit/text";

// golden/original/*.json was recorded from the original page in a real browser (pnpm golden:record).
// The expected output is that snapshot plus the three logged corrections (golden/corrections.ts).
describe.each(Object.entries(FIXTURES))("kit matches the original: %s", (name, input) => {
  const golden = patchSnapshot(
    JSON.parse(readFileSync(`golden/original/${name}.json`, "utf8")) as { header: string; sections: string[]; clips: string[] },
  );
  const got = kitText(generateKit(input));

  it("header", () => expect(got.header).toBe(golden.header));
  it("has the same number of sections", () => expect(got.sections.length).toBe(golden.sections.length));
  it.each(golden.sections.map((s, i) => [i, s] as const))("section %i", (i, text) => {
    expect(got.sections[i]).toBe(text);
  });
  it("copy payloads (build prompt, 15 openers x 2, 8 messages)", () => expect(got.clips).toEqual(golden.clips));
});
