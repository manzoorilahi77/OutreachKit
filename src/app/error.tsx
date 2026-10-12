"use client";

import { Button } from "@/components/ui/Button";
import { Note } from "@/components/ui/Note";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const known = /team data is format|Pull the latest code/.test(error.message);
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-12 sm:px-6">
      <h1 className="text-3xl">Something went wrong</h1>
      <Note tone="firm">
        <p role="alert">{known ? error.message + ' Say to Claude: "Fix the Outreach Kit sync".' : "The page couldn't load. Your work is saved. Try again, and if it keeps happening say to Claude: \"Fix the Outreach Kit sync\"."}</p>
      </Note>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
