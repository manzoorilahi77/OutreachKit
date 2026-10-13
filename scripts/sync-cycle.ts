// `pnpm sync:cycle`: what the sync-data and owner-sync skills run. Node only, so Mac and Windows agree.
//
//   pnpm sync:cycle --user <username>             pull main into the work branch, then send your work to main
//   pnpm sync:cycle --pull                        pull main into the work branch, send nothing
//   pnpm sync:cycle --check-code                  list code changes that are not in main yet (owner), send nothing
//   pnpm sync:cycle --include-code                as the plain sync, but code may go to main too (owner, after confirming)
//
// The work branch is sales_outreach for everyone but the super admin, who uses feature_dev_main. The username is
// remembered in .local/sync-user (never committed), so --user is only needed the first time.
// Exit code: 0 done, 1 stopped (the message says what to tell Claude), 2 code is waiting for a yes, 3 usage.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isRole, type Role } from "../src/lib/auth/roles";
import { isUsername } from "../src/lib/store/paths";
import { allowedPaths, runSync, workBranchFor, SENTENCE_FIX } from "../src/lib/sync/engine";
import { gitIn } from "../src/lib/sync/git";

const root = process.env.OKIT_ROOT ? path.resolve(process.env.OKIT_ROOT) : process.cwd();
const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const value = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const say = (s: string) => console.log(s);
const stop = (s: string, code: number): never => { console.error(s); process.exit(code); };

const git = gitIn(root);
const idFile = path.join(root, ".local", "sync-user");

async function main() {
  if ((await git(["rev-parse", "--is-inside-work-tree"])).code !== 0) stop("This folder isn't a copy of the Outreach Kit repo.", 3);

  const username = value("user") ?? (existsSync(idFile) ? readFileSync(idFile, "utf8").trim() : "");
  if (!isUsername(username)) stop("Which username is this? Run again with: pnpm sync:cycle --user <username>", 3);
  const userFile = path.join(root, "team", "users", `${username}.json`);
  if (!existsSync(userFile)) stop(`No account file for "${username}" here yet. Run "git pull" once, or check the spelling.`, 3);
  const role = (JSON.parse(readFileSync(userFile, "utf8")) as { role?: string }).role;
  if (!isRole(role)) stop(`The account file for "${username}" has no valid role.`, 3);
  mkdirSync(path.dirname(idFile), { recursive: true });
  writeFileSync(idFile, username + "\n", "utf8");
  const r = role as Role;
  const branch = workBranchFor(r);

  // Be on the work branch. A new branch starts where this folder is now, so nothing already done is lost.
  const current = (await git(["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim();
  if (current !== branch) {
    const exists = (await git(["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`])).code === 0;
    const sw = await git(exists ? ["checkout", branch] : ["checkout", "-b", branch]);
    if (sw.code !== 0) stop(`Couldn't switch to ${branch}: ${sw.stderr.trim().split("\n").pop()}\nSay "${SENTENCE_FIX}".`, 1);
    say(`Switched to ${branch}.`);
  }

  if (flag("check-code")) {
    const allowed = allowedPaths(r, username);
    const dirty = (await git(["status", "--porcelain", "--untracked-files=all"])).stdout.split("\n").filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, ""));
    const ahead = (await git(["diff", "--name-only", "origin/main..HEAD"])).stdout.split("\n").filter(Boolean);
    const code = [...new Set([...dirty, ...ahead])].filter((f) => !f.startsWith(".local/") && !allowed.some((p) => f === p || f.startsWith(p + "/")));
    say(code.length ? `Code changes not in main yet (${code.length}):\n${code.map((f) => `  ${f}`).join("\n")}` : "No code changes waiting.");
    process.exit(code.length ? 2 : 0);
  }

  const result = await runSync({ root, username, role: r, pullOnly: flag("pull"), allowCode: flag("include-code") });
  if (!result.ok) {
    const e = result.error;
    stop(`${e?.message ?? "The sync stopped."}${e?.sentence ? `\nTell Claude: "${e.sentence}"` : ""}`, 1);
  }
  if (flag("pull")) say(result.pulled ? `${branch} now has the latest from main.` : `${branch} was already up to date with main.`);
  else say(result.pushed ? `Done. Your work is in main${result.pulled ? " and you have everyone else's latest" : ""}.` : result.pulled ? "Done. You have the latest from main; you had nothing new to send." : "Already up to date. Nothing to send.");
}

main().catch((e) => stop(`Sync stopped: ${e instanceof Error ? e.message : String(e)}`, 1));
