"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions";
import { assignLeads } from "@/app/team/actions";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import { TableWrap, td, th } from "@/components/ui/TableWrap";

export interface AssignRow { key: string; business: string; where: string; stage: string; from: string; score: number }

/** Tick leads, pick a BD, Assign. The same form hands over a leaver's leads (`kind="handover"`). */
export function AssignForm({ rows, bds, kind }: { rows: AssignRow[]; bds: { username: string; label: string }[]; kind: "assign" | "handover" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(assignLeads, null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const all = rows.length > 0 && picked.size === rows.length;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <TableWrap label={kind === "assign" ? "Unassigned leads" : "Open leads"} minWidth={720}>
        <thead>
          <tr>
            <th scope="col" className={th}>
              <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="size-5 accent-head" checked={all} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.key)) : new Set())} /> <span>All</span></label>
            </th>
            {["Business", "Where", "Stage", "Score", kind === "assign" ? "Sourced by" : "Held by"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className={td}>
                <label className="flex min-h-11 items-center">
                  <input
                    type="checkbox" name="lead" value={r.key} className="size-5 accent-head" checked={picked.has(r.key)}
                    onChange={(e) => setPicked((cur) => { const n = new Set(cur); if (e.target.checked) n.add(r.key); else n.delete(r.key); return n; })}
                  />
                  <span className="sr-only">Pick {r.business}</span>
                </label>
              </td>
              <td className={`${td} font-medium`}>{r.business}</td>
              <td className={td}>{r.where}</td>
              <td className={td}>{r.stage}</td>
              <td className={`${td} tabular-nums`}>{r.score} / 10</td>
              <td className={td}>{r.from}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <Field id="to" label={kind === "assign" ? "Give them to" : "Hand them to"}>
            <Select id="to" name="to" defaultValue="">
              <option value="">Choose a BD</option>
              {bds.map((b) => <option key={b.username} value={b.username}>{b.label}</option>)}
            </Select>
          </Field>
        </div>
        <Button type="submit" disabled={pending || !rows.length}>{pending ? "Saving…" : kind === "assign" ? "Assign" : "Hand over"}{picked.size ? ` ${picked.size}` : ""}</Button>
      </div>
      {state && (
        <p className="flex items-start gap-2" role={state.ok ? "status" : "alert"}>
          {state.ok ? <CheckIcon className="mt-1 shrink-0" /> : <AlertIcon className="mt-1 shrink-0" />}<span>{state.message}</span>
        </p>
      )}
    </form>
  );
}
