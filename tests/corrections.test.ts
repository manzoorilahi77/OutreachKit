import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KIT_PATCHES } from "../golden/corrections";
import { CORRECTIONS, STRUCT_CORRECTIONS } from "../scripts/lib/corrections";

const changes = readFileSync("CHANGES.md", "utf8");

describe("CHANGES.md", () => {
  it("lists exactly three corrections", () => {
    const headings = changes.match(/^## Correction \d/gm) ?? [];
    expect(headings).toEqual(["## Correction 1", "## Correction 2", "## Correction 3"]);
  });
  it.each(CORRECTIONS.map((c) => [c.location, c.old, c.new] as const))("records the playbook change: %s", (loc, oldText, newText) => {
    expect(changes).toContain(loc);
    expect(changes).toContain(oldText.trim());
    expect(changes).toContain(newText.trim());
  });
  it.each(STRUCT_CORRECTIONS.map((c) => [c.location, c.new as string[]] as const))("records the playbook change: %s", (loc, parts) => {
    expect(changes).toContain(loc);
    expect(changes).toContain(parts.join(""));
  });
  it.each(KIT_PATCHES.map((p) => [p.location, p.newDesc ?? p.new] as const))("records the kit change: %s", (loc, newText) => {
    expect(changes).toContain(loc);
    expect(changes).toContain(newText.trim() || "(removed)");
  });
});
