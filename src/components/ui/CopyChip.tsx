"use client";

import { useEffect, useRef, useState } from "react";
import { writeClipboard } from "@/lib/clipboard";
import { AlertIcon, CheckIcon } from "./Icons";

// A search string, hashtag or route that copies on click. Feedback is text and icon, not colour.
export function CopyChip({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    setState((await writeClipboard(text)) ? "copied" : "error");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1400);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-left text-sm text-fg hover:border-head"
    >
      {state === "copied" && <CheckIcon className="shrink-0" />}
      {state === "error" && <AlertIcon className="shrink-0" />}
      <span>{state === "copied" ? "Copied" : state === "error" ? "Couldn't copy" : text}</span>
    </button>
  );
}
