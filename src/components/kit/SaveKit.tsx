"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveKit } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import type { KitInput } from "@/lib/kit/types";

export type SaveMode = "signed-in" | "signed-out" | "off";

/** Save controls under a kit. Signed out, it sends the rep to sign in and brings them back to the same kit. */
export function SaveKit({ input, mode }: { input: KitInput; mode: SaveMode }) {
  const [result, setResult] = useState<{ ok: true; id: string } | { ok: false; error: string } | null>(null);
  const [pending, start] = useTransition();
  if (mode === "off") return null;

  if (mode === "signed-out") {
    const back = window.location.pathname + window.location.search + (window.location.search.includes("build=1") ? "" : (window.location.search ? "&" : "?") + "build=1");
    return (
      <p>
        <Link href={`/login?next=${encodeURIComponent(back)}`}>Sign in to save this kit</Link>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        disabled={pending || result?.ok === true}
        onClick={() =>
          start(async () => setResult(await saveKit({ category: input.cat, device: input.device, state: input.st, city: input.city })))
        }
      >
        {pending ? "Saving…" : "Save this kit"}
      </Button>
      {result?.ok && (
        <span className="flex items-center gap-2" role="status"><CheckIcon /> Saved. <Link href={`/kits/${result.id}`}>Open it from your kits</Link></span>
      )}
      {result && !result.ok && <span className="flex items-center gap-2" role="alert"><AlertIcon /> {result.error}</span>}
    </div>
  );
}
