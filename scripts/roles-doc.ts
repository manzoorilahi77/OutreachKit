// pnpm roles:doc: writes docs/roles.md from the permission map.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderRolesDoc } from "../src/lib/auth/rolesDoc";

const file = path.join(process.cwd(), "docs", "roles.md");
mkdirSync(path.dirname(file), { recursive: true });
writeFileSync(file, renderRolesDoc());
console.log(`Wrote ${path.relative(process.cwd(), file)}`);
