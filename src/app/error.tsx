"use client";

import { Button } from "@/components/ui/Button";
import { Note } from "@/components/ui/Note";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-12 sm:px-6">
      <h1 className="text-3xl">Something went wrong</h1>
      <Note tone="firm">
        <p role="alert">The page couldn&apos;t load. Your work is saved. Try again, and if it keeps happening tell the owner.</p>
      </Note>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
