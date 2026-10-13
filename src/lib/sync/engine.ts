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
import { ghIn, gitIn, type Gh, type Git } from "./git";

export const SENTENCE_FIX = "Fix the Outreach Kit sync";
export const SENTENCE_AUTH = "Set up GitHub sign-in for the Outreach Kit";

/** `main` is the shared copy. BD people work on `sales_outreach`, the owner on `feature_dev_main`; both reach `main` by pull request. */
export const MAIN_BRANCH = "main";
export const BD_BRANCH = "sales_outreach";
export const OWNER_BRANCH = "feature_dev_main";
export const WORK_BRANCHES: readonly string[] = [BD_BRANCH, OWNER_BRANCH];
export const workBranchFor = (role: Role): string => (role === "super_admin" ? OWNER_BRANCH : BD_BRANCH);

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

export interface SyncOptions {
  root: string; username: string; role: Role; git?: Git; now?: () => string;
  /** The GitHub CLI; tests pass a fake. Only used on a work branch. */
  gh?: Gh;
  /** Let commits outside the person's own paths (code) go to main. The owner's skill sets this after confirming. */
  allowCode?: boolean;
  /** Work branch only: bring main in, send nothing. */
  pullOnly?: boolean;
}

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
  if (paths.length && !o.pullOnly) {
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

  if (WORK_BRANCHES.includes(branch)) {
    const failure = await viaMain({ o, git, gh: o.gh ?? ghIn(o.root), remote, branch, stamp, result });
    if (failure) return fail(failure);
    result.ok = true;
    invalidateStore(o.root);
    await writeState(o.root, { lastSyncedAt: stamp, lastAttemptAt: stamp, error: null });
    return result;
  }

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

const count = async (git: Git, range: string) => {
  const r = await git(["rev-list", "--count", range]);
  return r.code === 0 ? Number(r.stdout.trim()) || 0 : 0;
};

/**
 * The work-branch cycle. `main` is the shared copy; the work branch is this person's lane to it.
 *   1. fetch, then rebase the work branch onto origin/main (this is the "pull")
 *   2. refuse to send code unless allowCode (the commit step already staged only this person's paths)
 *   3. push the work branch (a plain fast-forward push; if someone else pushed it, rebase onto theirs once)
 *   4. open a pull request into main (or reuse the open one) and merge it with a merge commit
 *   5. fast-forward the local branch to main
 * A merge commit, not a squash, so the local branch is always an ancestor of main and nothing ever needs a hard reset.
 * Any failure stops with the work intact; `rebase --abort` puts every file back.
 */
async function viaMain(c: { o: SyncOptions; git: Git; gh: Gh; remote: string; branch: string; stamp: string; result: SyncResult }): Promise<SyncFailure | null> {
  const { o, git, gh, remote, branch, stamp, result } = c;
  const main = `${remote}/${MAIN_BRANCH}`;

  const rebaseOn = async (ref: string): Promise<SyncFailure | null> => {
    const r = await git(["pull", "--rebase", "--autostash", remote, ref]);
    if (r.code === 0) return null;
    if (NO_REMOTE_REF.test(r.stderr) && !AUTH.test(r.stderr)) return null;
    await git(["rebase", "--abort"]);
    await git(["merge", "--abort"]);
    return classify(r.stderr);
  };

  const bringMainIn = async (): Promise<SyncFailure | null> => {
    const f = await git(["fetch", remote]);
    if (f.code !== 0) return classify(f.stderr);
    const behind = await count(git, `HEAD..${main}`);
    if (behind === 0) return null;
    const err = await rebaseOn(MAIN_BRANCH);
    if (!err) result.pulled = true;
    return err;
  };

  const err1 = await bringMainIn();
  if (err1) return err1;
  if (o.pullOnly) return null;

  const ahead = await count(git, `${main}..HEAD`);
  if (ahead === 0) return null;

  if (!o.allowCode) {
    const allowed = allowedPaths(o.role, o.username);
    const files = (await git(["diff", "--name-only", `${main}..HEAD`])).stdout.split("\n").filter(Boolean);
    const outside = files.filter((f) => !allowed.some((p) => f === p || f.startsWith(p + "/")));
    if (outside.length) {
      return { kind: "other", sentence: null, message: `These commits hold files that aren't yours, so nothing was sent to main: ${outside.slice(0, 3).join(", ")}${outside.length > 3 ? ", and more" : ""}.` };
    }
  }

  const pushBranch = (lease?: string) => git(["push", ...(lease ? [`--force-with-lease=${branch}:${lease}`] : []), remote, `HEAD:refs/heads/${branch}`]);
  let p = await pushBranch();
  if (p.code !== 0 && REJECTED.test(p.stderr) && !AUTH.test(p.stderr)) {
    // Someone else pushed this branch and has not merged yet: put their commits underneath ours.
    const err = await rebaseOn(branch);
    if (err) return err;
    p = await pushBranch();
  }
  if (p.code !== 0) return classify(p.stderr);
  result.pushed = true;

  const openPr = async (): Promise<SyncFailure | null> => {
    const list = await gh(["pr", "list", "--head", branch, "--base", MAIN_BRANCH, "--state", "open", "--json", "number", "--jq", "length"]);
    if (list.code !== 0) return classify(list.stderr);
    if (list.stdout.trim() !== "0") return null;
    const made = await gh(["pr", "create", "--base", MAIN_BRANCH, "--head", branch, "--title", `sync: ${o.username} ${stamp}`, "--body", "Automatic Outreach Kit sync. Opened and merged by the sync."]);
    return made.code === 0 ? null : classify(made.stderr);
  };
  const merge = () => gh(["pr", "merge", branch, "--merge"]);

  let e = await openPr();
  if (e) return e;
  let m = await merge();
  if (m.code !== 0 && !AUTH.test(m.stderr)) {
    // main moved after we looked (or the pull request was closed under us): rebase again, push, and merge once more.
    const tip = (await git(["rev-parse", "HEAD"])).stdout.trim();
    const err = await bringMainIn();
    if (err) return err;
    const again = await pushBranch(tip);
    if (again.code !== 0) return classify(again.stderr);
    e = await openPr();
    if (e) return e;
    m = await merge();
  }
  if (m.code !== 0) return classify(m.stderr);

  // main now holds our commits, so this is a plain fast-forward.
  const f = await git(["fetch", remote]);
  if (f.code !== 0) return classify(f.stderr);
  const ff = await git(["merge", "--ff-only", main]);
  if (ff.code !== 0) return { kind: "other", sentence: SENTENCE_FIX, message: "Your work reached main, but this computer could not catch up with it just yet. Sync again." };
  return null;
}

/** Changes not yet pushed: files edited in this person's paths, plus commits ahead of the remote. */
export async function pendingChanges(o: { root: string; username: string; role: Role; git?: Git }): Promise<number> {
  const git = o.git ?? gitIn(o.root);
  if ((await git(["rev-parse", "--is-inside-work-tree"])).code !== 0) return 0;
  const paths = allowedPaths(o.role, o.username).filter((p) => existsSync(path.join(o.root, p)));
  let n = 0;
  if (paths.length) n += (await git(["status", "--porcelain", "--", ...paths])).stdout.split("\n").filter(Boolean).length;
  const branch = (await git(["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim();
  // On a work branch "not shared yet" means "not in main yet".
  const ahead = await git(["rev-list", "--count", WORK_BRANCHES.includes(branch) ? "origin/main..HEAD" : "@{u}..HEAD"]);
  if (ahead.code === 0) n += Number(ahead.stdout.trim()) || 0;
  return n;
}
