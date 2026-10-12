// GET /api/sync: the Sync control's status. POST /api/sync: run a sync now (button, app start, every 30 minutes).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { can } from "@/lib/auth/permissions";
import { rootDir } from "@/lib/store/paths";
import { pendingChanges, readSyncState, runSync, SENTENCE_FIX } from "@/lib/sync/engine";
import { sameOrigin } from "@/lib/scrape/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const g = globalThis as { __okitStartSynced?: boolean };

const sha = (file: string) => {
  try { return createHash("sha1").update(readFileSync(file)).digest("hex"); } catch { return ""; }
};

/** The app needs a restart when package.json or the lockfile changed since predev last installed. */
function restartNeeded(root: string): boolean {
  const file = path.join(root, ".local", "install-state.json");
  if (!existsSync(file)) return false;
  try {
    const s = JSON.parse(readFileSync(file, "utf8")) as { pkg?: string; lock?: string };
    return s.pkg !== sha(path.join(root, "package.json")) || s.lock !== sha(path.join(root, "pnpm-lock.yaml"));
  } catch {
    return false;
  }
}

async function status() {
  const session = await getSession();
  if (!session || !can(session, "sync.run")) return null;
  const root = rootDir();
  const state = await readSyncState(root);
  const pending = await pendingChanges({ root, username: session.user.username, role: session.user.role });
  return { session, body: { lastSyncedAt: state.lastSyncedAt, pending, error: state.error, restartNeeded: restartNeeded(root) } };
}

export async function GET() {
  const s = await status();
  if (!s) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  return NextResponse.json(s.body);
}

export async function POST(request: Request) {
  if (!sameOrigin(request.headers)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const s = await status();
  if (!s) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const reason = new URL(request.url).searchParams.get("reason");
  // "Start" runs once per server start, however many tabs open.
  if (reason === "start") {
    if (g.__okitStartSynced) return NextResponse.json(s.body);
    g.__okitStartSynced = true;
  }
  const root = rootDir();
  const result = await runSync({ root, username: s.session.user.username, role: s.session.user.role });
  const after = await status();
  return NextResponse.json({ ...(after?.body ?? s.body), ok: result.ok, sentence: result.error?.sentence ?? (result.ok ? null : SENTENCE_FIX) });
}
