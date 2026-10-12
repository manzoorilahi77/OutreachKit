import { describe, expect, it } from "vitest";
import { findProblems } from "../scripts/lib/secrets";

const repo = (tracked: string[], files: Record<string, string> = {}) => ({
  tracked,
  teamFiles: Object.keys(files).filter((f) => f.startsWith("team/")),
  read: (p: string) => files[p] ?? null,
});

describe("secrets:check", () => {
  it("passes a clean repo", () => {
    expect(findProblems(repo(["package.json", ".env.example", "team/users/a.json"], {
      "team/users/a.json": JSON.stringify({ tempPasswordHash: "$2b$12$abc", rev: 1 }),
      "team/data/a/profile.json": JSON.stringify({ passwordHash: "$2b$12$abc", basedOnRev: 1 }),
    }))).toEqual([]);
  });
  it("fails on a tracked session secret, .local file or .env file", () => {
    expect(findProblems(repo([".local/session-secret"]))[0]).toMatch(/\.local/);
    expect(findProblems(repo(["somewhere/session-secret"]))[0]).toMatch(/session secret/);
    expect(findProblems(repo([".env"]))[0]).toMatch(/Environment/);
    expect(findProblems(repo([".env.local"])).length).toBe(1);
    expect(findProblems(repo([".env.example"]))).toEqual([]);
  });
  it("fails on a plain-text password field anywhere in team/", () => {
    const bad = findProblems(repo([], { "team/users/a.json": JSON.stringify({ username: "a", password: "hunter22" }) }));
    expect(bad[0]).toMatch(/plain-text "password"/);
    expect(findProblems(repo([], { "team/data/a/audit.jsonl": '{"ok":1}\n{"detail":{"tempPassword":"abc"}}\n' }))[0]).toMatch(/tempPassword/);
    expect(findProblems(repo([], { "team/users/a.json": JSON.stringify({ password: "" }) }))).toEqual([]);
  });
});
