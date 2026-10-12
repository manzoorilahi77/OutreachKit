import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gitIn, type Git } from "@/lib/sync/git";
import { allowedPaths, classify, pendingChanges, readSyncState, runSync, SENTENCE_AUTH, SENTENCE_FIX } from "@/lib/sync/engine";
import { createStore } from "@/lib/store/fileStore";
import { initOwner, hash, lead, OWNER } from "./helpers/team";
import { Repo, sh } from "./helpers/laptops";

const repo = new Repo();
let ownerDir = "";
afterAll(() => repo.cleanup());

const sync = (root: string, username: string, role: "super_admin" | "admin" | "manager" | "bd" | "researcher" | "viewer") => runSync({ root, username, role });
const bdStore = (root: string, username: string) => createStore({ username, role: "bd", team: "team-a" }, root);

beforeAll(async () => {
  ownerDir = repo.laptop("owner-laptop");
  repo.seedCode(ownerDir);
  await initOwner(ownerDir);
  const owner = createStore(OWNER, ownerDir);
  await owner.saveTeams({ teams: [{ id: "team-a", name: "Team A", managers: [] }] });
  await owner.createUser({ username: "ravi", fullName: "Ravi Rao", role: "bd", team: "team-a", tempPasswordHash: hash("tmp") });
  await owner.createUser({ username: "asha", fullName: "Asha Aziz", role: "bd", team: "team-a", tempPasswordHash: hash("tmp") });
  const r = await sync(ownerDir, "owner", "super_admin");
  expect(r).toMatchObject({ ok: true, committed: true, pushed: true, error: null });
});

describe("the allowed paths", () => {
  it("are the person's own folder, plus the account files an admin may write", () => {
    expect(allowedPaths("bd", "ravi")).toEqual(["team/data/ravi"]);
    expect(allowedPaths("researcher", "meera")).toEqual(["team/data/meera"]);
    expect(allowedPaths("admin", "ada")).toEqual(["team/data/ada", "team/users", "team/teams.json", "team/workspace.json"]);
    expect(allowedPaths("super_admin", "owner")).toEqual(["team/data/owner", "team/users", "team/teams.json", "team/workspace.json", "team/schema.json"]);
  });
});

describe("two laptops", () => {
  it("the owner creates a user and syncs; the BD laptop pulls and finds the account", async () => {
    const ravi = repo.laptop("ravi-laptop");
    expect(existsSync(path.join(ravi, "team", "users", "ravi.json"))).toBe(true);
    expect((await createStore(null, ravi).getUser("ravi"))?.role).toBe("bd");
    // The owner's password hash came along, never a plain password.
    expect(readFileSync(path.join(ravi, "team", "data", "owner", "profile.json"), "utf8")).not.toContain("owner-password-1");
  });

  it("the BD adds a lead and syncs; the owner pulls and sees it", async () => {
    const ravi = repo.laptop("ravi-laptop-2");
    await bdStore(ravi, "ravi").createLead(lead({ business_name: "Smith Roofing", phone: "(214) 555-0101" }));
    const r = await sync(ravi, "ravi", "bd");
    expect(r).toMatchObject({ ok: true, committed: true, pushed: true });
    expect(sh(ravi, "log", "-1", "--format=%s")).toMatch(/^sync: ravi \d{4}-\d{2}-\d{2}T/);

    const o = await sync(ownerDir, "owner", "super_admin");
    expect(o).toMatchObject({ ok: true, pulled: true });
    const seen = await createStore(OWNER, ownerDir).listLeads();
    expect(seen.map((l) => l.business_name)).toContain("Smith Roofing");
    expect((await readSyncState(ownerDir)).lastSyncedAt).toBeTruthy();
  });

  it("a second BD is blocked from adding the same business once synced", async () => {
    const asha = repo.laptop("asha-laptop");
    const s = bdStore(asha, "asha");
    await expect(s.createLead(lead({ business_name: "Smith Roofing", phone: "" }))).rejects.toThrow("Smith Roofing is already Ravi's lead.");
    expect(await s.listLeads()).toHaveLength(0); // and she can't see it
  });

  it("a conflicting edit aborts cleanly, keeps the local file, and says what to tell Claude", async () => {
    const a = repo.laptop("ravi-a");
    const b = repo.laptop("ravi-b");
    const id = (await bdStore(a, "ravi").listLeads())[0]!.id;
    const file = (d: string) => path.join(d, "team", "data", "ravi", "leads", `${id}.json`);
    const edit = (d: string, notes: string) => {
      const j = JSON.parse(readFileSync(file(d), "utf8"));
      writeFileSync(file(d), JSON.stringify({ ...j, notes }, null, 2) + "\n");
    };
    edit(a, "edited on laptop A");
    expect((await sync(a, "ravi", "bd")).ok).toBe(true);
    edit(b, "edited on laptop B");
    const r = await sync(b, "ravi", "bd");
    expect(r.ok).toBe(false);
    expect(r.error).toMatchObject({ kind: "conflict", sentence: SENTENCE_FIX });
    // Nothing lost, nothing half-done.
    expect(JSON.parse(readFileSync(file(b), "utf8")).notes).toBe("edited on laptop B");
    expect(existsSync(path.join(b, ".git", "rebase-merge")) || existsSync(path.join(b, ".git", "rebase-apply"))).toBe(false);
    expect(sh(b, "status", "--porcelain", "--", "team")).toBe("");
    expect(sh(b, "diff", "--name-only", "--diff-filter=U")).toBe("");
    const state = await readSyncState(b);
    expect(state.error?.sentence).toBe(SENTENCE_FIX);
  });

  it("never stages a file outside the allowed paths", async () => {
    const d = repo.laptop("ravi-c");
    await bdStore(d, "ravi").createLead(lead({ business_name: "Zeta Fence", phone: "2145550999" }));
    // Things a teammate must not be able to push by accident:
    writeFileSync(path.join(d, "package.json"), '{"name":"changed"}\n');
    writeFileSync(path.join(d, "src", "app.ts"), "export const hacked = 1;\n");
    mkdirSync(path.join(d, "team", "data", "asha", "leads"), { recursive: true });
    writeFileSync(path.join(d, "team", "data", "asha", "leads", "x.json"), "{}\n");
    writeFileSync(path.join(d, "team", "users", "ravi.json"), '{"role":"super_admin"}\n');
    sh(d, "add", "src/app.ts"); // and something the person staged themselves
    const r = await sync(d, "ravi", "bd");
    expect(r.ok).toBe(true);
    const files = sh(d, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD").split("\n").filter(Boolean);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.startsWith("team/data/ravi/"))).toBe(true);
    // The other changes are still there, untouched and uncommitted.
    expect(readFileSync(path.join(d, "package.json"), "utf8")).toContain("changed");
    expect(sh(d, "status", "--porcelain")).toMatch(/package\.json/);
    expect(sh(d, "ls-tree", "-r", "origin/main", "--name-only")).not.toMatch(/team\/data\/asha\/leads\/x\.json/);
    expect(sh(d, "show", "origin/main:src/app.ts")).toBe("export {};\n");
  });

  it("reports pending changes until they are pushed", async () => {
    const d = repo.laptop("ravi-d");
    expect(await pendingChanges({ root: d, username: "ravi", role: "bd" })).toBe(0);
    await bdStore(d, "ravi").createLead(lead({ business_name: "Eta Paving", phone: "2145550888" }));
    expect(await pendingChanges({ root: d, username: "ravi", role: "bd" })).toBeGreaterThan(0);
    await sync(d, "ravi", "bd");
    expect(await pendingChanges({ root: d, username: "ravi", role: "bd" })).toBe(0);
  });

  it("retries once when someone pushed first", async () => {
    const x = repo.laptop("asha-x");
    const y = repo.laptop("asha-y");
    await bdStore(x, "asha").createLead(lead({ business_name: "Theta Tile", phone: "2145550777" }));
    await bdStore(y, "ravi").createLead(lead({ business_name: "Iota Ironwork", phone: "2145550666" }));
    // y pulls, and just before it pushes, x gets there first.
    const real = gitIn(y);
    let raced = false;
    const git: Git = async (args, o) => {
      if (args[0] === "push" && !raced) {
        raced = true;
        expect((await sync(x, "asha", "bd")).ok).toBe(true);
      }
      return real(args, o);
    };
    const r = await runSync({ root: y, username: "ravi", role: "bd", git });
    expect(raced).toBe(true);
    expect(r).toMatchObject({ ok: true, pushed: true });
    sh(x, "pull", "--rebase");
    expect(existsSync(path.join(x, "team", "data", "ravi"))).toBe(true);
  });
});

describe("failure sentences", () => {
  it("tells a missing GitHub sign-in apart from a clash and from being offline", () => {
    expect(classify("fatal: could not read Username for 'https://github.com': terminal prompts disabled")).toMatchObject({ kind: "auth", sentence: SENTENCE_AUTH });
    expect(classify("remote: Repository not found.\nfatal: Authentication failed")).toMatchObject({ kind: "auth" });
    expect(classify("CONFLICT (content): Merge conflict in team/data/ravi/leads/x.json\nCould not apply 1234")).toMatchObject({ kind: "conflict", sentence: SENTENCE_FIX });
    expect(classify("fatal: unable to access 'https://github.com/x/y.git/': Could not resolve host: github.com")).toMatchObject({ kind: "offline", sentence: null });
    expect(classify("something odd")).toMatchObject({ kind: "other", sentence: SENTENCE_FIX });
  });

  it("an unreachable remote keeps the work and offers no sentence", async () => {
    const d = repo.laptop("ravi-e");
    await bdStore(d, "ravi").createLead(lead({ business_name: "Kappa Kitchens", phone: "2145550555" }));
    sh(d, "remote", "set-url", "origin", path.join(d, "does-not-exist.git"));
    const r = await sync(d, "ravi", "bd");
    expect(r.ok).toBe(false);
    expect(r.error?.kind).toBe("offline");
    expect(sh(d, "log", "-1", "--format=%s")).toMatch(/^sync: ravi/); // committed locally
  });

  it("a folder with no remote commits locally and says so", async () => {
    const d = repo.laptop("ravi-f");
    sh(d, "remote", "remove", "origin");
    await bdStore(d, "ravi").createLead(lead({ business_name: "Lambda Lawns", phone: "2145550444" }));
    expect(await sync(d, "ravi", "bd")).toMatchObject({ ok: true, localOnly: true, committed: true });
  });
});
