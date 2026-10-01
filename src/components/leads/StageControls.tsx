"use client";

import { useState, useTransition } from "react";
import { moveStage } from "@/app/leads/actions";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import { STAGES, type Stage } from "@/lib/leads/stages";
import { localToday } from "./TodayInput";

export function StageControls({ id, stage }: { id: string; stage: Stage }) {
  const [to, setTo] = useState<Stage>(stage);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const idx = STAGES.findIndex((s) => s.value === stage);
  const next = idx >= 0 && idx < 6 ? STAGES[idx + 1] : undefined;

  const move = (target: Stage) =>
    start(async () => {
      const r = await moveStage(id, target, localToday());
      setMsg({ ok: r?.ok ?? false, text: r?.message ?? "" });
      if (r?.ok) setTo(target);
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48">
          <label htmlFor="stage-select" className="field-label mb-1 block text-base">Stage</label>
          <Select id="stage-select" value={to} onChange={(e) => setTo(e.target.value as Stage)}>
            {STAGES.map((s) => <option key={s.value} value={s.value}>{s.n} · {s.label}</option>)}
          </Select>
        </div>
        <Button variant="secondary" disabled={pending || to === stage} onClick={() => move(to)}>Move</Button>
        {next && <Button disabled={pending} onClick={() => move(next.value)}>Move to {next.label}</Button>}
      </div>
      {msg && <p className="flex items-center gap-2" role={msg.ok ? "status" : "alert"}>{msg.ok ? <CheckIcon /> : <AlertIcon />}{msg.text}</p>}
    </div>
  );
}
