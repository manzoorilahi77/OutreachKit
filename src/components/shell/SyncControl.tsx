"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import { Note } from "@/components/ui/Note";
import { agoText } from "@/lib/ago";

interface SyncStatus {
  lastSyncedAt: string | null;
  pending: number;
  error: { kind: string; message: string; sentence: string | null } | null;
  restartNeeded: boolean;
}

export const SYNC_EVERY_MS = 30 * 60 * 1000;

/**
 * The Sync control: "Synced 12 min ago", the number of changes not pushed yet, or what went wrong and the sentence to say to Claude.
 * It syncs when the app starts (once per server start), every 30 minutes while someone is signed in, and when pressed.
 */
export function SyncControl() {
  const router = useRouter();
  const [s, setS] = useState<SyncStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(() => Date.now());
  const busy = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/sync", { cache: "no-store" });
      if (r.ok) setS((await r.json()) as SyncStatus);
    } catch { /* offline: keep what we show */ }
  }, []);

  const run = useCallback(async (reason: "start" | "timer" | "button") => {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    setFailed(false);
    try {
      const r = await fetch(`/api/sync?reason=${reason}`, { method: "POST" });
      if (r.ok) {
        const j = (await r.json()) as SyncStatus & { ok?: boolean };
        setS(j);
        if (j.ok !== false) router.refresh();
      } else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setRunning(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
    void run("start");
    const every = setInterval(() => void run("timer"), SYNC_EVERY_MS);
    const clock = setInterval(() => setTick(Date.now()), 30_000);
    const poll = setInterval(() => void load(), 60_000);
    return () => { clearInterval(every); clearInterval(clock); clearInterval(poll); };
  }, [load, run]);

  let text = "Checking sync…";
  let bad = false;
  if (running) text = "Syncing…";
  else if (s?.error) {
    bad = true;
    text = s.error.sentence ? `${s.error.message} Say to Claude: “${s.error.sentence}”.` : s.error.message;
  } else if (failed) {
    bad = true;
    text = "Couldn't sync. Your work is saved here.";
  } else if (s && s.pending > 0) text = `${s.pending} change${s.pending === 1 ? "" : "s"} not synced yet`;
  else if (s?.lastSyncedAt) text = `Synced ${agoText(Date.parse(s.lastSyncedAt), tick)}`;
  else if (s) text = "Not synced yet";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="sync-control">
      <p className="flex items-start gap-2" role={bad ? "alert" : "status"} aria-live="polite">
        {bad ? <AlertIcon className="mt-0.5 shrink-0" /> : s?.lastSyncedAt && !running && !s.pending ? <CheckIcon className="mt-0.5 shrink-0" /> : null}
        <span>{text}</span>
      </p>
      <Button variant="secondary" disabled={running} onClick={() => void run("button")}>{running ? "Syncing…" : "Sync now"}</Button>
      {s?.restartNeeded && (
        <div className="basis-full"><Note tone="firm"><p role="alert">Restart needed: ask Claude to restart the Outreach Kit.</p></Note></div>
      )}
    </div>
  );
}
