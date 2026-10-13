import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Gh } from "@/lib/sync/git";
import { runSync, BD_BRANCH, OWNER_BRANCH, workBranchFor, type SyncOptions } from "@/lib/sync/engine";
import { createStore } from "@/lib/store/fileStore";
import { initOwner, hash, lead, OWNER } from "./helpers/team";
import { Repo, sh } from "./helpers/laptops";

// A fake `gh` that does what GitHub does for `pr merge --merge`: merges the branch into main in the bare repo.
function fakeGh(repo: Repo, log: string[][] = [], failMerges = 0): Gh {
  const open = new Set<string>();
  let fails = failMerges;
  return async (args) => {
    log.push(args);
    const [a, b] = args;
    if (a === "pr" && b === "list") return { code: 0, stdout: open.has(args[args.indexOf("--head") + 1]!) ? "1\n" : "0\n", stderr: "" };
    if (a === "pr" && b === "create") { open.add(args[args.indexOf("--head") + 1]!); return { code: 0, stdout: "url", stderr: "" }; }
    if (a === "pr" && b === "merge") {
      if (fails > 0) { fails--; return { code: 1, stdout: "", stderr: "Pull request is not mergeable: the base branch was modified" }; }
      const branch = args[2]!;
      const tmp = repo.laptop();
      sh(tmp, "fetch", "origin");
      sh(tmp, "checkout", "-B", "main", "origin/main");
      sh(tmp, "merge", "--no-edit", "--no-ff", `origin/${branch}`);
      sh(tmp, "push", "origin", "main");
      open.delete(branch);
      return { code: 0, stdout: "", stderr: "" };
    }
    return { code: 1, stdout: "", stderr: "unknown gh call" };
  };
}

const repo = new Repo();
let ownerDir = "";
afterAll(() => repo.cleanup());
const bd = (root: string, username: string) => createStore({ username, role: "bd", team: "team-a" }, root);
const run = (root: string, username: string, role: SyncOptions["role"], gh: Gh, extra: Partial<SyncOptions> = {}) => runSync({ root, username, role, gh, ...extra });
const onBranch = (dir: string, b: string) => sh(dir, "checkout", "-B", b);

beforeAll(async () => {
  ownerDir = repo.laptop("owner-laptop");
  repo.seedCode(ownerDir);
  await initOwner(ownerDir);
  const owner = createStore(OWNER, ownerDir);
  await owner.saveTeams({ teams: [{ id: "team-a", name: "Team A", managers: [] }] });
  await owner.createUser({ username: "ravi", fullName: "Ravi Rao", role: "bd", team: "team-a", tempPasswordHash: hash("tmp") });
  await owner.createUser({ username: "asha", fullName: "Asha Aziz", role: "bd", team: "team-a", tempPasswordHash: hash("tmp") });
  expect((await runSync({ root: ownerDir, username: "owner", role: "super_admin" })).ok).toBe(true);
});

describe("branch names", () => {
  it("the owner works on feature_dev_main, everyone else on sales_outreach", () => {
    expect(workBranchFor("super_admin")).toBe(OWNER_BRANCH);
    for (const r of ["admin", "manager", "bd", "researcher", "viewer"] as const) expect(workBranchFor(r)).toBe(BD_BRANCH);
  });
});

describe("a BD on sales_outreach", () => {
  it("a lead made on the branch reaches main, and the branch is caught up with main afterwards", async () => {
    const d = repo.laptop("ravi-1");
    onBranch(d, BD_BRANCH);
    await bd(d, "ravi").createLead(lead({ business_name: "Branch Roofing", phone: "(214) 555-0201" }));
    const log: string[][] = [];
    const r = await run(d, "ravi", "bd", fakeGh(repo, log));
    expect(r).toMatchObject({ ok: true, committed: true, pushed: true, error: null });
    expect(log.map((l) => l.slice(0, 2).join(" "))).toEqual(["pr list", "pr create", "pr merge"]);
    expect(sh(repo.bare, "ls-tree", "-r", "main", "--name-only")).toMatch(/team\/data\/ravi\/leads\//);
    expect(sh(d, "rev-parse", "HEAD").trim()).toBe(sh(repo.bare, "rev-parse", "main").trim());
    expect(sh(d, "rev-parse", "--abbrev-ref", "HEAD").trim()).toBe(BD_BRANCH);
  });

  it("pulls what another person put in main before sending", async () => {
    const a = repo.laptop("asha-1");
    onBranch(a, BD_BRANCH);
    await bd(a, "asha").createLead(lead({ business_name: "Asha Paving", phone: "(214) 555-0202" }));
    expect((await run(a, "asha", "bd", fakeGh(repo))).ok).toBe(true);
    const d = repo.laptop("ravi-2");
    onBranch(d, BD_BRANCH);
    sh(d, "reset", "--hard", "HEAD~1"); // an older view of main
    const r = await run(d, "ravi", "bd", fakeGh(repo));
    expect(r).toMatchObject({ ok: true, pulled: true });
    expect(existsSync(path.join(d, "team", "data", "asha"))).toBe(true);
  });

  it("with nothing new it opens no pull request", async () => {
    const d = repo.laptop("ravi-3");
    onBranch(d, BD_BRANCH);
    const log: string[][] = [];
    expect(await run(d, "ravi", "bd", fakeGh(repo, log))).toMatchObject({ ok: true, pushed: false });
    expect(log).toEqual([]);
  });

  it("retries the merge once when main moved under it", async () => {
    const d = repo.laptop("ravi-4");
    onBranch(d, BD_BRANCH);
    await bd(d, "ravi").createLead(lead({ business_name: "Retry Fence", phone: "(214) 555-0203" }));
    const log: string[][] = [];
    const r = await run(d, "ravi", "bd", fakeGh(repo, log, 1));
    expect(r).toMatchObject({ ok: true, pushed: true });
    expect(log.filter((l) => l[1] === "merge")).toHaveLength(2);
    expect(sh(repo.bare, "ls-tree", "-r", "main", "--name-only")).toMatch(/team\/data\/ravi\/leads\//);
  });

  it("refuses to send code to main, and leaves it where it is", async () => {
    const d = repo.laptop("ravi-5");
    onBranch(d, BD_BRANCH);
    writeFileSync(path.join(d, "src", "app.ts"), "export const sneaky = 1;\n");
    sh(d, "commit", "-am", "code on a BD laptop");
    const log: string[][] = [];
    const r = await run(d, "ravi", "bd", fakeGh(repo, log));
    expect(r.ok).toBe(false);
    expect(r.error?.message).toMatch(/aren't yours.*src\/app\.ts/);
    expect(log).toEqual([]);
    expect(sh(repo.bare, "show", "main:src/app.ts")).toBe("export {};\n");
  });

  it("a missing GitHub CLI says to sign in", async () => {
    const d = repo.laptop("ravi-6");
    onBranch(d, BD_BRANCH);
    await bd(d, "ravi").createLead(lead({ business_name: "No Gh Tile", phone: "(214) 555-0204" }));
    const gh: Gh = async () => ({ code: 127, stdout: "", stderr: "The GitHub CLI (gh) is not installed. Run: gh auth login" });
    const r = await run(d, "ravi", "bd", gh);
    expect(r.ok).toBe(false);
    expect(r.error).toMatchObject({ kind: "auth" });
    expect(sh(d, "log", "-1", "--format=%s")).toMatch(/^sync: ravi/); // still committed here
  });
});

describe("the owner on feature_dev_main", () => {
  it("pull brings main in and sends nothing", async () => {
    const o = repo.laptop("owner-2");
    onBranch(o, OWNER_BRANCH);
    sh(o, "reset", "--hard", "HEAD~2");
    const log: string[][] = [];
    const r = await run(o, "owner", "super_admin", fakeGh(repo, log), { pullOnly: true });
    expect(r).toMatchObject({ ok: true, pulled: true, pushed: false });
    expect(log).toEqual([]);
    expect(sh(o, "rev-parse", "HEAD").trim()).toBe(sh(repo.bare, "rev-parse", "main").trim());
  });

  it("data goes through; code waits for allowCode", async () => {
    const o = repo.laptop("owner-3");
    onBranch(o, OWNER_BRANCH);
    writeFileSync(path.join(o, "src", "app.ts"), "export const feature = 1;\n");
    sh(o, "commit", "-am", "new feature");
    const held = await run(o, "owner", "super_admin", fakeGh(repo));
    expect(held.ok).toBe(false);
    expect(sh(repo.bare, "show", "main:src/app.ts")).toBe("export {};\n");
    const sent = await run(o, "owner", "super_admin", fakeGh(repo), { allowCode: true });
    expect(sent).toMatchObject({ ok: true, pushed: true });
    expect(sh(repo.bare, "show", "main:src/app.ts")).toBe("export const feature = 1;\n");
  });
});
