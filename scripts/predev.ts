// Runs before `pnpm dev` (pnpm's predev hook). Node only: the same on Mac and Windows.
//   1. create .local/ and the session secret if missing
//   2. a quiet `git pull --rebase --autostash` when the repo has a remote (code and accounts arrive here)
//   3. `pnpm install` when package.json or the lockfile changed since the last run
//   4. `pnpm secrets:check`
// Nothing here blocks the app for a network problem: a failed pull is a one-line note.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sessionSecret } from "../src/lib/auth/secret";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); // where the app code is
const root = process.env.OKIT_ROOT ? path.resolve(process.env.OKIT_ROOT) : process.cwd();
const sha = (f: string) => { try { return createHash("sha1").update(readFileSync(path.join(root, f))).digest("hex"); } catch { return ""; } };
const git = (...args: string[]) => spawnSync("git", args, { cwd: root, encoding: "utf8", timeout: 60_000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" } });

mkdirSync(path.join(root, ".local"), { recursive: true });
sessionSecret(root);

// 2. Pull, quietly.
if (git("rev-parse", "--is-inside-work-tree").status === 0 && git("remote").stdout.trim()) {
  const pull = git("pull", "--rebase", "--autostash", "--quiet");
  if (pull.status !== 0) {
    git("rebase", "--abort");
    console.log("predev: couldn't pull from GitHub just now (offline, or sign-in missing). Starting with what is here.");
  }
}

// 3. Install when the dependency files changed.
const stateFile = path.join(root, ".local", "install-state.json");
const now = { pkg: sha("package.json"), lock: sha("pnpm-lock.yaml") };
let before: { pkg?: string; lock?: string } = {};
try { before = JSON.parse(readFileSync(stateFile, "utf8")); } catch { /* first run */ }
const skipInstall = process.env.OKIT_SKIP_INSTALL === "1"; // the two-laptop e2e runs predev in folders that hold no app code
if (!skipInstall && (!existsSync(path.join(root, "node_modules")) || before.pkg !== now.pkg || before.lock !== now.lock)) {
  console.log("predev: dependencies changed. Running pnpm install…");
  const r = spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["install"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) {
    console.error("predev: pnpm install failed.");
    process.exit(1);
  }
}
writeFileSync(stateFile, JSON.stringify(now, null, 2) + "\n");

// 4. Secrets.
try {
  execFileSync(process.execPath, [path.join(here, "node_modules", "tsx", "dist", "cli.mjs"), path.join(here, "scripts", "secrets-check.ts")], { cwd: root, stdio: "inherit", env: { ...process.env, OKIT_ROOT: root } });
} catch {
  process.exit(1);
}
