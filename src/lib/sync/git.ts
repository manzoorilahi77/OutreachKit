// git through child_process.execFile: no shell, so nothing a person types ends up in a command line.
import { execFile } from "node:child_process";

export interface GitResult { code: number; stdout: string; stderr: string }
export type Git = (args: string[], opts?: { timeoutMs?: number }) => Promise<GitResult>;

export function gitIn(cwd: string): Git {
  return (args, opts) =>
    new Promise((resolve) => {
      execFile(
        "git", args,
        {
          cwd, timeout: opts?.timeoutMs ?? 120_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
          // English messages for the error classifier; never wait for a password prompt in a terminal that isn't there.
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_EDITOR: "true", LC_ALL: "C", LANG: "C" },
        },
        (err, stdout, stderr) => {
          const code = err ? (typeof (err as NodeJS.ErrnoException & { code?: unknown }).code === "number" ? ((err as unknown as { code: number }).code) : 1) : 0;
          resolve({ code, stdout: String(stdout), stderr: String(stderr) + (err && !stderr ? String(err.message) : "") });
        },
      );
    });
}

/** The GitHub CLI, same shape as `Git`. A missing `gh` reads as a sign-in problem, which has its own sentence. */
export type Gh = Git;

export function ghIn(cwd: string): Gh {
  return (args, opts) =>
    new Promise((resolve) => {
      execFile(
        "gh", args,
        { cwd, timeout: opts?.timeoutMs ?? 120_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true, env: { ...process.env, GH_PROMPT_DISABLED: "1", GH_NO_UPDATE_NOTIFIER: "1", NO_COLOR: "1", LC_ALL: "C", LANG: "C" } },
        (err, stdout, stderr) => {
          if (err && (err as NodeJS.ErrnoException).code === "ENOENT") {
            return resolve({ code: 127, stdout: "", stderr: "The GitHub CLI (gh) is not installed. Run: gh auth login" });
          }
          const code = err ? (typeof (err as NodeJS.ErrnoException & { code?: unknown }).code === "number" ? ((err as unknown as { code: number }).code) : 1) : 0;
          resolve({ code, stdout: String(stdout), stderr: String(stderr) + (err && !stderr ? String(err.message) : "") });
        },
      );
    });
}
