// pnpm team:init: the owner runs this once. It asks for the workspace and the owner's own login, then writes team/.
// Flags skip the questions (used by tests): --workspace --studio --domain --username --name, and the password from OKIT_OWNER_PASSWORD.
import { createInterface } from "node:readline/promises";
import path from "node:path";
import { hashPassword, generateTempPassword, passwordProblem } from "../src/lib/auth/password";
import { hasSuperAdmin, initTeam } from "../src/lib/store/bootstrap";
import { rootDir, usernameProblem } from "../src/lib/store/paths";

const root = rootDir();
const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? (args[i + 1] ?? "") : null; };

if (await hasSuperAdmin(root)) {
  console.error("team/users already has a super admin, so team:init has already been run. Nothing was changed.");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
async function ask(label: string, given: string | null, check?: (v: string) => string | null): Promise<string> {
  for (;;) {
    const v = (given ?? (await rl.question(`${label}: `))).trim();
    const problem = !v ? "This can't be empty." : check?.(v) ?? null;
    if (!problem) return v;
    if (given !== null) { console.error(problem); process.exit(1); }
    console.log(problem);
  }
}

/** Reads a password without echoing it. */
async function askHidden(label: string): Promise<string> {
  if (!process.stdin.isTTY) return (await rl.question(`${label}: `)).trim();
  const out = process.stdout;
  out.write(`${label}: `);
  return new Promise((resolve) => {
    let buf = "";
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") { stdin.setRawMode(false); stdin.off("data", onData); out.write("\n"); resolve(buf); return; }
        if (c === "\u0003") process.exit(130);
        if (c === "\u007f" || c === "\b") buf = buf.slice(0, -1);
        else buf += c;
      }
    };
    stdin.on("data", onData);
  });
}

console.log("Set up the Famysys Outreach Kit workspace. This runs once, on your computer.\n");
const workspaceName = await ask("Workspace name (for example Famysys)", flag("workspace"));
const studio = await ask("Studio or brand used in every kit", flag("studio"));
const demoDomain = await ask("Demo domain (for example famysys.com)", flag("domain"));
const username = (await ask("Your username (3 to 30 characters: letters, digits, dot, underscore)", flag("username"), (v) => usernameProblem(v.toLowerCase()))).toLowerCase();
const fullName = await ask("Your full name", flag("name"));

let password = process.env.OKIT_OWNER_PASSWORD ?? "";
if (password) {
  const p = passwordProblem(password, username);
  if (p) { console.error(p); process.exit(1); }
} else {
  for (;;) {
    password = await askHidden("Choose your password (10 or more characters)");
    const p = passwordProblem(password, username);
    if (p) { console.log(p); continue; }
    if ((await askHidden("Type it again")) !== password) { console.log("They don't match. Try again."); continue; }
    break;
  }
}
rl.close();

await initTeam(root, {
  workspaceName, studio, demoDomain, username, fullName,
  passwordHash: await hashPassword(password),
  unusableTempHash: await hashPassword(generateTempPassword() + generateTempPassword()),
});

console.log(`\nDone. Wrote ${path.join("team", "")} with your account (${username}).`);
console.log("\nNext:");
console.log("  1. pnpm dev, then open http://localhost:3000 and sign in.");
console.log("  2. Users → Create user for each teammate. Copy their username and temporary password to them.");
console.log("  3. Press Sync, then add each teammate's GitHub account to the private repo.");
console.log("  4. Import your earlier leads with Leads → Import CSV.");
