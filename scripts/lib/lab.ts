// Two "laptops" for the e2e: clones of one temporary bare repo, each with its own app instance (OKIT_ROOT) over the same build.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runSync } from "../../src/lib/sync/engine";

const REPO = process.cwd();
const tsx = path.join(REPO, "node_modules", "tsx", "dist", "cli.mjs");

export const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" }, stdio: ["ignore", "pipe", "pipe"] });

export interface Lab {
  base: string;
  bare: string;
  ownerRoot: string;
  teammateRoot: string;
  ownerPassword: string;
  cleanup(): void;
}

/** The repo as the owner pushed it: a stub of code (so package.json can change), ignore rules, the workspace and the owner's account. */
export async function createLab(): Promise<Lab> {
  const base = mkdtempSync(path.join(tmpdir(), "okit-lab-"));
  const bare = path.join(base, "origin.git");
  mkdirSync(bare);
  git(bare, "init", "--bare", "-b", "main");
  const ownerRoot = path.join(base, "owner-laptop");
  git(base, "clone", bare, ownerRoot);
  git(ownerRoot, "config", "user.email", "owner@example.com");
  git(ownerRoot, "config", "user.name", "owner");
  git(ownerRoot, "checkout", "-B", "main");
  writeFileSync(path.join(ownerRoot, ".gitignore"), ".local/\nteam/**/*.tmp\n");
  writeFileSync(path.join(ownerRoot, ".gitattributes"), "team/** text eol=lf\n");
  writeFileSync(path.join(ownerRoot, "package.json"), '{"name":"outreach-kit-stub"}\n');
  writeFileSync(path.join(ownerRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  git(ownerRoot, "add", ".");
  git(ownerRoot, "commit", "-m", "code");
  git(ownerRoot, "push", "-u", "origin", "main");

  const ownerPassword = "correct-horse-battery-1";
  execFileSync(process.execPath, [tsx, path.join(REPO, "scripts", "team-init.ts"), "--workspace", "Famysys", "--studio", "Famysys", "--domain", "famysys.com", "--username", "owner", "--name", "Olive Owner"], {
    cwd: REPO, stdio: "inherit", env: { ...process.env, OKIT_ROOT: ownerRoot, OKIT_OWNER_PASSWORD: ownerPassword },
  });
  const r = await runSync({ root: ownerRoot, username: "owner", role: "super_admin" });
  if (!r.ok) throw new Error("The owner's first sync failed: " + JSON.stringify(r.error));

  const teammateRoot = path.join(base, "teammate-laptop");
  git(base, "clone", bare, teammateRoot);
  git(teammateRoot, "config", "user.email", "teammate@example.com");
  git(teammateRoot, "config", "user.name", "teammate");
  return { base, bare, ownerRoot, teammateRoot, ownerPassword, cleanup: () => rmSync(base, { recursive: true, force: true }) };
}

/** What `pnpm dev` does first (predev): pull, then check secrets. */
export function runPredev(root: string) {
  execFileSync(process.execPath, [tsx, path.join(REPO, "scripts", "predev.ts")], { cwd: REPO, stdio: "inherit", env: { ...process.env, OKIT_ROOT: root, OKIT_SKIP_INSTALL: "1" } });
}
