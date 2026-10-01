"use client";

import { useEffect, useState } from "react";
import { CHECKS } from "@/data";
import type { Inline } from "@/content/types";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { InlineView } from "./InlineView";
import { VERDICT_LABEL, scoreOf, verdictOf } from "@/lib/leads/score";

const KEY = "ok.scorer.v1";

// The playbook's try-it scorer, as in the original: kept in this browser, carried over after a reload.
// Saved, per-lead scoring lives on the lead itself.
export function Scorer({ fine }: { fine?: Inline[] }) {
  const [checks, setChecks] = useState<boolean[]>(() => CHECKS.map(() => false));
  const [carried, setCarried] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
      if (Array.isArray(saved) && saved.some(Boolean)) {
        setChecks(CHECKS.map((_, i) => !!saved[i]));
        setCarried(true);
      }
    } catch {}
  }, []);

  function toggle(i: number) {
    const next = checks.map((v, j) => (j === i ? !v : v));
    setChecks(next);
    setCarried(false);
    try { localStorage.setItem(KEY, JSON.stringify(next.map((v) => (v ? 1 : 0)))); } catch {}
  }
  function nextLead() {
    setChecks(CHECKS.map(() => false));
    setCarried(false);
    try { localStorage.removeItem(KEY); } catch {}
  }

  const n = scoreOf(checks);
  const verdict = verdictOf(n);
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {CHECKS.map(([label, hint], i) => (
          <li key={label}>
            <label className="flex min-h-11 cursor-pointer gap-3 p-4">
              <input type="checkbox" checked={checks[i]} onChange={() => toggle(i)} className="mt-1 size-6 shrink-0 accent-head" />
              <span>
                <strong className="block">{label}</strong>
                <span className="block text-muted">{hint}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="space-y-3 rounded-lg border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3" aria-live="polite">
          <span className="text-3xl font-medium text-head tabular-nums">{n} / 10</span>
          <Chip variant={verdict}>{VERDICT_LABEL[verdict]}</Chip>
          <Button variant="secondary" onClick={nextLead}>Next lead</Button>
          {carried && <span className="text-sm text-muted">Carried over from your last session</span>}
        </div>
        {fine && <p className="max-w-3xl text-sm text-muted"><InlineView parts={fine} /></p>}
      </div>
    </div>
  );
}
