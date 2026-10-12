// pnpm secrets:check: fails if a session secret, a plain-text password field, or a .env file is tracked. Run by predev and pnpm test.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { findProblems } from "./lib/secrets";

const root = process.env.OKIT_ROOT ? path.resolve(process.env.OKIT_ROOT) : process.cwd();

function tracked(): string[] {
  try {
    return execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\0").filter(Boolean);
  } catch {
    return []; // not a git checkout: nothing can be tracked
  }
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const teamFiles = walk(path.join(root, "team")).map((f) => path.relative(root, f).split(path.sep).join("/"));
const problems = findProblems({
  tracked: tracked(),
  teamFiles,
  read: (f) => { try { return readFileSync(path.join(root, f), "utf8"); } catch { return null; } },
});

if (problems.length) {
  console.error("secrets:check failed:\n" + problems.map((p) => "  " + p).join("\n"));
  process.exit(1);
}
console.log(`secrets:check passed (${teamFiles.length} files under team/).`);
