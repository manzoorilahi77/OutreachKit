"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { applyItImport, previewItImport, type ItImportPreview } from "@/app/it/actions";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { IT_CSV_HEADER_HINT } from "@/lib/it/importCsv";
import { signalInfo, type SignalType } from "@/lib/it/model";

const ACTION = { add: "Add", attach: "Add the signal", duplicate: "Skip: duplicate", error: "Skip: error" } as const;

/** A sheet of companies and signals: a dry run first, then apply. The server re-reads the file on apply. */
export function ImportProspects() {
  const [csv, setCsv] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<ItImportPreview | null>(null);
  const [done, setDone] = useState<Awaited<ReturnType<typeof applyItImport>> | null>(null);
  const [pending, start] = useTransition();

  async function onFile(file: File | undefined) {
    setPreview(null);
    setDone(null);
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    setName(file.name);
    start(async () => setPreview(await previewItImport(text)));
  }

  const counts = preview?.ok ? (["add", "attach", "duplicate", "error"] as const).map((a) => [a, preview.rows.filter((r) => r.action === a).length] as const) : [];
  const doable = preview?.ok ? preview.rows.filter((r) => r.action === "add" || r.action === "attach").length : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="it-csv" className="field-label block">CSV file</label>
        <p id="it-csv-hint" className="max-w-3xl text-sm text-muted">
          A header row with a Company column, plus any of: {IT_CSV_HEADER_HINT}. Close names work too (“Company name”, “Job URL”, “Date posted”).
          An export of the us-it-lead-drafts tracker sheet works as it is. Up to 200 rows.
        </p>
        <input id="it-csv" type="file" accept=".csv,text/csv" aria-describedby="it-csv-hint" onChange={(e) => onFile(e.target.files?.[0])}
          className="block min-h-11 w-full max-w-xl rounded-md border border-line bg-surface p-2 text-base" />
      </div>

      {pending && !preview && <p role="status">Reading {name}…</p>}
      {preview && !preview.ok && <p role="alert" className="flex items-center gap-2"><AlertIcon /> {preview.error}</p>}

      {preview?.ok && !done?.ok && (
        <section aria-labelledby="itp-h" className="space-y-4">
          <h3 id="itp-h" className="text-xl">Dry run</h3>
          <p role="status">{counts.map(([a, n]) => `${n} ${ACTION[a].toLowerCase()}`).join(" · ")}</p>
          {preview.unknownHeaders.length > 0 && <p className="text-muted">Columns not used: {preview.unknownHeaders.join(", ")}.</p>}
          <TableWrap label="What the import will do" minWidth={720}>
            <thead><tr>{["Line", "Company", "Signal", "What happens", "Why"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {preview.rows.map((r) => (
                <tr key={r.line}>
                  <td className={`${td} tabular-nums`}>{r.line}</td>
                  <td className={`${td} font-medium text-head`}>{r.company || "—"}</td>
                  <td className={td}>{r.signal ? signalInfo(r.signal as SignalType).label : "—"}</td>
                  <td className={td}>{ACTION[r.action]}</td>
                  <td className={td}>{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {doable > 0 && csv && (
            <Button disabled={pending} onClick={() => start(async () => setDone(await applyItImport(csv)))}>
              {pending ? "Importing…" : `Apply: ${doable} row${doable === 1 ? "" : "s"}`}
            </Button>
          )}
        </section>
      )}

      {done && (done.ok
        ? (
          <div className="space-y-2" role="status">
            <p className="flex items-center gap-2"><CheckIcon /> Added {done.added} prospect{done.added === 1 ? "" : "s"} and {done.attached} signal{done.attached === 1 ? "" : "s"} to existing ones. <Link href="/it/prospects">Open the prospects</Link></p>
            {done.failed.length > 0 && <ul className="list-disc pl-6">{done.failed.map((f) => <li key={f}>{f}</li>)}</ul>}
          </div>
        )
        : <p role="alert" className="flex items-center gap-2"><AlertIcon /> {done.error}</p>)}
    </div>
  );
}
