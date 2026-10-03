import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIXTURES } from "../golden/fixtures";
import { EMPTY_CONSOLE, fromQuery, toQuery } from "@/lib/console";
import { buildContext, generateKit } from "@/lib/kit/generate";
import { applyCategoryKit } from "@/lib/kit-v2/apply";
import { DOWNLOAD_HEADINGS, downloadName, kitMarkdown } from "@/lib/kit-v2/download";
import type { CategoryKit } from "@/lib/kit-v2/types";

const fencing = JSON.parse(readFileSync("src/kits/fencing-gates.json", "utf8")) as CategoryKit;
const input = FIXTURES["fencing-austin-desktop"]!;
const X = buildContext(input);
const meta = { X, marketLabel: "Mid-size market", dir: "c" as const, generatedAt: "2026-10-03T00:00:00.000Z" };

// Prompt C parses this file, so its front matter and headings are fixed.
describe("Download kit (.md)", () => {
  const md = kitMarkdown(applyCategoryKit(generateKit(input), X, fencing, "c"), { ...meta, ck: fencing });
  const generic = kitMarkdown(generateKit(input), { ...meta, ck: null });

  it("is named fieldkit_<kitSlug>_<citySlug>.md", () => {
    expect(downloadName(X)).toBe("fieldkit_fencing-gates_austin.md");
  });

  it("starts with the fixed front matter keys", () => {
    const fm = md.split("---\n")[1]!.trim().split("\n").map((l) => l.split(":")[0]);
    expect(fm).toEqual(["category", "slug", "city", "state", "marketLabel", "device", "demoPattern", "direction", "contentSource", "reviewStatus", "generatedAt"]);
    expect(md).toContain('contentSource: "category"');
    expect(md).toContain('direction: "c"');
    expect(generic).toContain('contentSource: "generic"');
  });

  it("keeps its headings", () => {
    const headings = (t: string) => t.split("\n").filter((l) => /^#{1,3} /.test(l));
    expect(headings(md)).toMatchSnapshot();
    for (const h of Object.values(DOWNLOAD_HEADINGS)) {
      expect(md).toContain("\n" + h + "\n");
      expect(generic).toContain("\n" + h + "\n");
    }
    expect(headings(md).filter((h) => /^### \d\d · /.test(h))).toHaveLength(15);
    expect(md).toContain("### Email · day 5 · public business address only");
  });
});

describe("direction persistence", () => {
  it("round-trips dir through the URL, and only once a kit was built with one", () => {
    const s = { ...EMPTY_CONSOLE, cat: "Fencing & gates", st: "TX" as const, listCity: "Austin", dir: "c" as const };
    expect(toQuery(s)).toContain("dir=c");
    expect(fromQuery(toQuery(s))).toEqual(s);
    const { dir: _d, ...noDir } = s;
    void _d;
    expect(toQuery(noDir)).not.toContain("dir=");
    expect(fromQuery("cat=Fencing+%26+gates&dir=z").dir).toBeUndefined();
  });

  it("rebuilds a saved kit with its saved direction", () => {
    const k = applyCategoryKit(generateKit(input), X, fencing, "c");
    const dirs = k.sections.find((s) => s.id === "directions")!.nodes.find((n) => n.k === "directions")!;
    expect(dirs.k === "directions" && dirs.selected).toBe("c");
    const prompt = k.sections.find((s) => s.id === "prompt")!.nodes.find((n) => n.k === "copyBlock")!;
    expect(prompt.k === "copyBlock" && prompt.label).toMatch(/Direction C Estate Gate$/);
    expect(prompt.k === "copyBlock" && prompt.text).toContain("Set themeId: 'C4'");
  });
});
