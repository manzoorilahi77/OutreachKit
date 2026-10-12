// "Laptops" for the sync tests: clones of one temporary bare repo, each with its own working folder.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const sh = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" } });

export class Repo {
  readonly base = mkdtempSync(path.join(tmpdir(), "okit-sync-"));
  readonly bare = path.join(this.base, "origin.git");
  private n = 0;

  constructor() {
    mkdirSync(this.bare);
    sh(this.bare, "init", "--bare", "-b", "main");
  }

  /** A fresh clone, as a teammate would make. */
  laptop(name = `laptop${++this.n}`): string {
    const dir = path.join(this.base, name);
    sh(this.base, "clone", this.bare, dir);
    sh(dir, "config", "user.email", `${name}@example.com`);
    sh(dir, "config", "user.name", name);
    sh(dir, "checkout", "-B", "main");
    return dir;
  }

  /** The owner's first push: code, ignore rules, attributes. */
  seedCode(dir: string) {
    writeFileSync(path.join(dir, ".gitignore"), ".local/\nteam/**/*.tmp\n");
    writeFileSync(path.join(dir, ".gitattributes"), "team/** text eol=lf\n");
    writeFileSync(path.join(dir, "package.json"), '{"name":"app"}\n');
    mkdirSync(path.join(dir, "src"));
    writeFileSync(path.join(dir, "src", "app.ts"), "export {};\n");
    sh(dir, "add", ".");
    sh(dir, "commit", "-m", "code");
    sh(dir, "push", "-u", "origin", "main");
  }

  cleanup() {
    rmSync(this.base, { recursive: true, force: true });
  }
}
