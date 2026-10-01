"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { localToday } from "./TodayInput";

/** The date, plus a plain-words flag when it is due. Uses the rep's own date. */
export function DueText({ date }: { date: string | null }) {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(localToday()), []);
  if (!date) return <span className="text-muted">—</span>;
  const flag = today ? (date < today ? "Overdue" : date === today ? "Due today" : null) : null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="tabular-nums">{date}</span>
      {flag && <Chip variant="tier-b">{flag}</Chip>}
    </span>
  );
}
