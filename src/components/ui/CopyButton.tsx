"use client";

import { useEffect, useRef, useState } from "react";
import { writeClipboard } from "@/lib/clipboard";
import { AlertIcon, CheckIcon, CopyIcon } from "./Icons";

type State = "idle" | "copied" | "error";

export function CopyButton({
  text, label = "Copy", copiedLabel = "Copied", className = "",
}: { text: string; label?: string; copiedLabel?: string; className?: string }) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    setState((await writeClipboard(text)) ? "copied" : "error");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex min-h-11 items-center gap-2 rounded-md border border-head px-3 text-sm font-medium text-head hover:bg-head/10 ${state === "copied" ? "bg-head/10" : ""} ${className}`}
    >
      {state === "copied" ? <CheckIcon /> : state === "error" ? <AlertIcon /> : <CopyIcon />}
      <span aria-live="polite">
        {state === "copied" ? copiedLabel : state === "error" ? "Couldn't copy. Select the text and copy by hand." : label}
      </span>
    </button>
  );
}
