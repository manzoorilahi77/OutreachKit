"use client";

import { CopyButton } from "@/components/ui/CopyButton";
import { Button } from "@/components/ui/Button";
import { Note } from "@/components/ui/Note";

/** The login to share, shown once with Copy. It lives only in this browser tab: leaving or pressing "I've shared it" discards it. */
export function CredentialsPanel({ credentials, onDone, origin = "http://localhost:3000", reset = false }: {
  credentials: { fullName: string; username: string; password: string };
  onDone: () => void;
  origin?: string;
  reset?: boolean;
}) {
  const text = `Username ${credentials.username} · Temporary password ${credentials.password} · Ask your Claude to set up and run the Outreach Kit, then sign in at ${origin}`;
  return (
    <Note tone="firm">
      <div className="space-y-3" role="status">
        <h3 className="text-xl">{reset ? `New temporary password for ${credentials.fullName}` : `${credentials.fullName}'s login`}</h3>
        <p className="break-words">
          Username <strong data-testid="cred-username">{credentials.username}</strong> · Temporary password <strong data-testid="cred-password">{credentials.password}</strong> · Ask your Claude to set up and run the Outreach Kit, then sign in at {origin}
        </p>
        <p className="text-sm text-muted">This is the only time the password is shown. Only its scrambled hash is saved. They choose their own at first sign-in.</p>
        <p>Sync, then add their GitHub account to the repo.</p>
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton text={text} label="Copy" />
          <Button variant="secondary" onClick={onDone}>I&apos;ve shared it</Button>
        </div>
      </div>
    </Note>
  );
}
