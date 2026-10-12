// Sync: commit this person's own files, pull, push. It never stages code, so a teammate can't push code by accident.
//
//   1. stage ONLY the paths this person may write, and commit them ("sync: <username> <ISO time>")
//   2. git pull --rebase --autostash
//   3. git push; if the push is rejected, pull and push once more
//
// Committing first (the page lists pull first) means a clash can always be undone with `git rebase --abort`, which puts
// every file back exactly as it was: nothing is lost. On any conflict or missing GitHub sign-in the sync stops cleanly and
// returns the sentence the person should say to their Claude.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { can } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";
import { nowIso } from "@/lib/clock";
import { invalidateStore } from "@/lib/store/fileStore";
import { gitIn, type Git } from "./git";

export const SENTENCE_FIX = "Fix the Outreach Kit sync";
export const SENTENCE_AUTH = "Set up GitHub sign-in for the Outreach Kit";

export type SyncErrorKind = "auth" | "conflict" | "offline" | "other";
export interface SyncFailure { kind: SyncErrorKind; message: string; sentence: string | null }

export interface SyncState {
  lastSyncedAt: string | null;
  lastAttemptAt: string | null;
  error: SyncFailure | null;
}

export interface SyncResult { ok: boolean; committed: boolean; pulled: boolean; pushed: boolean; localOnly: boolean; error: SyncFailure | null }

/** The paths (relative to the repo root, forward slashes) this person's sync may stage. */
export function allowedPaths(role: Role, username: string): string[] {
  const paths = [`team/data/${username}`];
  if (can(role, "users.create")) paths.push("team/users");
  if (can(role, "workspace.manage")) paths.push("team/teams.json", "team/workspace.json");
  if (can(role, "content.approve")) paths.push("team/schema.json");
  return paths;
}

const AUTH = /Authentication failed|could not read (Username|Password)|terminal prompts disabled|Permission denied \(publickey\)|Repository not found|returned error: 40[13]|invalid credentials|password authentication was removed|HTTP 40[13]|The requested URL returned error: 40[13]|Invalid username or token|gh auth login/i;
const OFFLINE = /Could not resolve host|Failed to connect|Connection timed out|Network is unreachable|unable to access|Could not read from remote repository|early EOF|timed out/i;
const REJECTED = /rejected|non-fast-forward|fetch first|failed to push some refs|Updates were rejected/i;
const NO_REMOTE_REF = /couldn't find remote ref|no such ref was fetched|There is no tracking information|no upstream/i;

export function classify(stderr: string): SyncFailure {
  const msg = stderr.trim().split("\n").slice(-3).join(" ").slice(0, 300);
  if (AUTH.test(stderr)) return { kind: "auth", sentence: SENTENCE_AUTH, message: "GitHub didn't accept the sign-in on this computer." };
  if (OFFLINE.test(stderr) && !/CONFLICT|Could not apply/i.test(stderr)) return { kind: "offline", sentence: null, message: "Couldn't reach GitHub. Your work is saved here and will sync when you're back online." };
  if (/CONFLICT|Could not apply|conflict|rebase|unmerged/i.test(stderr)) return { kind: "conflict", sentence: SENTENCE_FIX, message: "Two changes clashed. Nothing was lost." };
  return { kind: "other", sentence: SENTENCE_FIX, message: msg || "The sync stopped." };
}

const stateFile = (root: string) => path.join(root, ".local", "sync.json");

export async function readSyncState(root: string): Promise<SyncState> {
  try {
    return { lastSyncedAt: null, lastAttemptAt: null, error: null, ...(JSON.parse(await readFile(stateFile(root), "utf8")) as Partial<SyncState>) };
  } catch {
    return { lastSyncedAt: null, lastAttemptAt: null, error: null };
  }
}

async function writeState(root: string, s: SyncState) {
  await mkdir(path.join(root, ".local"), { recursive: true });
  await writeFile(stateFile(root), JSON.stringify(s, null, 2) + "\n", "utf8");
}

export interface SyncOptions { root: string; username: string; role: Role; git?: Git; now?: () => string }

const g = globalThis as { __okitSyncing?: Map<string, Promise<SyncResult>> };
const inflight = (g.__okitSyncing ??= new Map());

/** One sync at a time per repo; a second caller gets the first one's result. */
export function runSync(o: SyncOptions): Promise<SyncResult> {
  const running = inflight.get(o.root);
  if (running) return running;
  const p = doSync(o).finally(() => inflight.delete(o.root));
  inflight.set(o.root, p);
  return p;
}

async function doSync(o: SyncOptions): Promise<SyncResult> {
  const git = o.git ?? gitIn(o.root);
  const stamp = (o.now ?? nowIso)();
  const result: SyncResult = { ok: false, committed: false, pulled: false, pushed: false, localOnly: false, error: null };
  const fail = async (e: SyncFailure): Promise<SyncResult> => {
    result.error = e;
    const prev = await readSyncState(o.root);
    await writeState(o.root, { ...prev, lastAttemptAt: stamp, error: e });
    invalidateStore(o.root);
    return result;
  };

  if ((await git(["rev-parse", "--is-inside-work-tree"])).code !== 0) {
    return fail({ kind: "other", sentence: SENTENCE_FIX, message: "This folder isn't a git copy of the repo." });
  }

  // 1. Stage only this person's paths and commit them.
  const paths = allowedPaths(o.role, o.username).filter((p) => existsSync(path.join(o.root, p)));
  if (paths.length) {
    const add = await git(["add", "-A", "--", ...paths]);
    if (add.code !== 0) return fail(classify(add.stderr));
    const staged = await git(["diff", "--cached", "--name-only", "--", ...paths]);
    if (staged.stdout.trim()) {
      const identity: string[] = [];
      if (!(await git(["config", "user.email"])).stdout.trim()) identity.push("-c", `user.email=${o.username}@outreachkit.local`);
      if (!(await git(["config", "user.name"])).stdout.trim()) identity.push("-c", `user.name=${o.username}`);
      const commit = await git([...identity, "commit", "-m", `sync: ${o.username} ${stamp}`, "--", ...paths]);
      if (commit.code !== 0) return fail(classify(commit.stderr + commit.stdout));
      // Belt and braces: the commit must hold nothing outside the allowed paths.
      const changed = (await git(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"])).stdout.split("\n").filter(Boolean);
      const ok = changed.every((f) => paths.some((p) => f === p || f.startsWith(p + "/")));
      if (!ok) {
        await git(["reset", "--soft", "HEAD~1"]);
        return fail({ kind: "other", sentence: SENTENCE_FIX, message: "The sync would have included files that aren't yours, so it stopped." });
      }
      result.committed = true;
    }
  }

  // No remote: the work is committed here and that is all there is to do.
  const remotes = (await git(["remote"])).stdout.split("\n").filter(Boolean);
  if (!remotes.length) {
    result.ok = true;
    result.localOnly = true;
    await writeState(o.root, { lastSyncedAt: stamp, lastAttemptAt: stamp, error: null });
    return result;
  }

  const branch = (await git(["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim();
  const hasUpstream = (await git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])).code === 0;
  const remote = remotes.includes("origin") ? "origin" : remotes[0]!;

  const pull = async (): Promise<SyncFailure | null> => {
    // Look first: when nothing new is on GitHub there is nothing to pull, and pulling would stash and re-apply every
    // uncommitted file in the folder for no reason (on the owner's laptop that is all of their unreleased code, and the
    // dev server would rebuild each time).
    if (hasUpstream) {
      const f = await git(["fetch", remote]);
      if (f.code !== 0) return classify(f.stderr);
      const behind = await git(["rev-list", "--count", "HEAD..@{u}"]);
      if (behind.code === 0 && Number(behind.stdout.trim()) === 0) return null;
    }
    const args = hasUpstream ? ["pull", "--rebase", "--autostash"] : ["pull", "--rebase", "--autostash", remote, branch];
    const r = await git(args);
    if (r.code === 0) {
      result.pulled = true;
      return null;
    }
    // An empty remote (first push of the repo) has nothing to pull yet.
    if (NO_REMOTE_REF.test(r.stderr) && !AUTH.test(r.stderr)) return null;
    await git(["rebase", "--abort"]);
    await git(["merge", "--abort"]);
    return classify(r.stderr);
  };

  const pullErr = await pull();
  if (pullErr) return fail(pullErr);

  // 3. Push, once more after a pull when someone pushed first.
  const push = () => git(hasUpstream ? ["push"] : ["push", "-u", remote, branch]);
  let p = await push();
  if (p.code !== 0 && REJECTED.test(p.stderr) && !AUTH.test(p.stderr)) {
    const again = await pull();
    if (again) return fail(again);
    p = await push();
  }
  if (p.code !== 0) return fail(REJECTED.test(p.stderr) ? { kind: "conflict", sentence: SENTENCE_FIX, message: "Someone pushed at the same moment. Nothing was lost." } : classify(p.stderr));
  result.pushed = true;
  result.ok = true;
  invalidateStore(o.root);
  await writeState(o.root, { lastSyncedAt: stamp, lastAttemptAt: stamp, error: null });
  return result;
}

/** Changes not yet pushed: files edited in this person's paths, plus commits ahead of the remote. */
export async function pendingChanges(o: { root: string; username: string; role: Role; git?: Git }): Promise<number> {
  const git = o.git ?? gitIn(o.root);
  if ((await git(["rev-parse", "--is-inside-work-tree"])).code !== 0) return 0;
  const paths = allowedPaths(o.role, o.username).filter((p) => existsSync(path.join(o.root, p)));
  let n = 0;
  if (paths.length) n += (await git(["status", "--porcelain", "--", ...paths])).stdout.split("\n").filter(Boolean).length;
  const ahead = await git(["rev-list", "--count", "@{u}..HEAD"]);
  if (ahead.code === 0) n += Number(ahead.stdout.trim()) || 0;
  return n;
}
