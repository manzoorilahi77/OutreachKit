"use client";

import { useMemo, useState } from "react";
import { buildContext, generateKit } from "@/lib/kit/generate";
import type { KitInput } from "@/lib/kit/types";
import { applyCategoryKit } from "@/lib/kit-v2/apply";
import type { CategoryKit, DirectionId } from "@/lib/kit-v2/types";
import { applyMarket } from "@/lib/market/apply";
import type { Rates } from "@/lib/market/currency";
import { DownloadKit } from "./DownloadKit";
import { KitView } from "./KitView";

/** A saved kit, rebuilt from its inputs with the direction it was saved with. Switching here is a preview; it doesn't re-save. */
export function SavedKitView({ input, ck, direction, rates, actions }: { input: KitInput; ck: CategoryKit | null; direction: DirectionId; rates: Rates; actions?: React.ReactNode }) {
  const [dir, setDir] = useState<DirectionId>(direction);
  const X = useMemo(() => buildContext(input), [input]);
  const kit = useMemo(() => applyMarket(applyCategoryKit(generateKit(input), X, ck, dir), X, { rates, lang: input.lang }), [input, X, ck, dir, rates]);
  return (
    <KitView
      kit={kit}
      extraChips={ck ? [] : ["Generic kit"]}
      onDirection={setDir}
      actions={<div className="flex flex-wrap items-center gap-3">{actions}<DownloadKit kit={kit} X={X} ck={ck} dir={dir} /></div>}
    />
  );
}
