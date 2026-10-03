"use client";

import { Button } from "@/components/ui/Button";
import { marketSize } from "@/lib/kit/helpers";
import type { Kit, KitContext } from "@/lib/kit/types";
import { downloadName, kitMarkdown } from "@/lib/kit-v2/download";
import type { CategoryKit, DirectionId } from "@/lib/kit-v2/types";

/** Writes the kit as a Markdown file for the Cowork prospecting task. Built in the browser; nothing is sent. */
export function DownloadKit({ kit, X, ck, dir }: { kit: Kit; X: KitContext; ck: CategoryKit | null; dir: DirectionId }) {
  function download() {
    const md = kitMarkdown(kit, {
      X, ck, dir,
      marketLabel: marketSize(kit.input.st, kit.input.city)[0],
      generatedAt: new Date().toISOString(),
    });
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName(X);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <Button variant="secondary" onClick={download}>Download kit (.md)</Button>;
}
