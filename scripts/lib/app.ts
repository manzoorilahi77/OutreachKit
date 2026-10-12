// Starting the built app for the browser scripts (a11y, shots, e2e). One build, any number of `next start` instances,
// each pointed at its own repo folder with OKIT_ROOT.
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import net from "node:net";
import path from "node:path";

export const REPO = process.cwd();
export const DIST = ".next-e2e";
const nextBin = path.join(REPO, "node_modules", "next", "dist", "bin", "next");

/** `next build` into its own folder, once. Pass rebuild to force it. */
function newest(dir: string): number {
  let t = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }
  return t;
}

/** Rebuilds when asked, when there is no build, or when a source file is newer than the build. */
export function ensureBuild(rebuild = process.argv.includes("--rebuild")) {
  const id = path.join(REPO, DIST, "BUILD_ID");
  if (!rebuild && existsSync(id) && statSync(id).mtimeMs > Math.max(newest(path.join(REPO, "src")), statSync(path.join(REPO, "package.json")).mtimeMs)) return;
  console.log("Building the app (once)…");
  execFileSync(process.execPath, [nextBin, "build"], { cwd: REPO, stdio: "inherit", env: { ...process.env, OKIT_DIST_DIR: DIST, NEXT_TELEMETRY_DISABLED: "1" } });
  // next build rewrites tsconfig.json to include its types folder; put it back.
  try { execFileSync("git", ["checkout", "--", "tsconfig.json"], { cwd: REPO, stdio: "ignore" }); } catch { /* not a checkout */ }
}

/** Free on every address (an IPv6-only listener still counts), not just 127.0.0.1. */
const free = (port: number) => new Promise<boolean>((resolve) => {
  const s = net.createServer().once("error", () => resolve(false)).once("listening", () => s.close(() => resolve(true))).listen(port);
});

export interface RunningApp { url: string; port: number; root: string; stop(): Promise<void> }

export async function startApp(o: { root: string; port: number; allowClock?: boolean; log?: boolean }): Promise<RunningApp> {
  if (!(await free(o.port))) throw new Error(`Port ${o.port} is in use. Stop what is using it, or set E2E_OWNER_PORT / E2E_TEAMMATE_PORT / PORT.`);
  const proc: ChildProcess = spawn(process.execPath, [nextBin, "start", "-p", String(o.port)], {
    cwd: REPO,
    env: { ...process.env, OKIT_ROOT: o.root, OKIT_DIST_DIR: DIST, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", ...(o.allowClock ? { OKIT_ALLOW_CLOCK_OVERRIDE: "1" } : {}) },
    stdio: o.log ? "inherit" : ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  proc.stderr?.on("data", (d) => { stderr += String(d); });
  const url = `http://localhost:${o.port}`;
  for (let i = 0; i < 120; i++) {
    if (proc.exitCode !== null) throw new Error(`The app on port ${o.port} exited: ${stderr.slice(-500)}`);
    try {
      if ((await fetch(url + "/login")).ok) break;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return {
    url, port: o.port, root: o.root,
    stop: () => new Promise<void>((resolve) => {
      if (proc.exitCode !== null) return resolve();
      proc.once("exit", () => resolve());
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 4000).unref();
    }),
  };
}
