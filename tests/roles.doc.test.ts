import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { renderRolesDoc } from "@/lib/auth/rolesDoc";

it("docs/roles.md is current (run `pnpm roles:doc` to regenerate)", () => {
  const onDisk = readFileSync(path.join(process.cwd(), "docs", "roles.md"), "utf8");
  expect(onDisk).toBe(renderRolesDoc());
});
