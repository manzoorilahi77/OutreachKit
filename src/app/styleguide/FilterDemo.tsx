"use client";

import { useState } from "react";
import { CopyChip } from "@/components/ui/CopyChip";
import { ToggleChip } from "@/components/ui/ToggleChip";

export function FilterDemo() {
  const [tier, setTier] = useState("all");
  return (
    <div className="space-y-4">
      <div role="group" aria-label="Sample filter" className="flex flex-wrap gap-2">
        {["all", "A", "B", "C"].map((t) => (
          <ToggleChip key={t} pressed={tier === t} onClick={() => setTier(t)}>{t === "all" ? "All tiers" : `Tier ${t}`}</ToggleChip>
        ))}
      </div>
      <p className="text-sm text-muted">Pressed is shown by fill. Copy chips hold search strings, hashtags and routes; press one to copy it.</p>
      <div className="flex flex-wrap gap-2">
        <CopyChip text="fence company near Austin, TX" />
        <CopyChip text="#austinfencing" />
        <CopyChip text="/service-area/[city]" />
      </div>
    </div>
  );
}
