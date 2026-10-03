import { describe, expect, it } from "vitest";
import { SKIP_DIRS, SKIP_FILES } from "../scripts/lib/brand-config";

// Brand rules bind the app's UI. Exactly two paths were exempted for Field Kit v2 (the vendored theme
// library and the direction preview canvas); everything else is what was exempt before.
describe("pnpm brand exemptions", () => {
  it("are exactly the original two files plus the two Field Kit v2 paths", () => {
    expect([...SKIP_FILES].sort()).toEqual(["src/data/style.ts", "src/lib/contrast.ts", "src/themes/library.ts"]);
    expect(SKIP_DIRS).toEqual(["src/components/kit/directions/"]);
  });
});
