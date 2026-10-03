"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { importLeads, previewLeadsImport } from "@/app/leads/actions";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import type { ImportPreview } from "@/lib/leads/import";
import { CHECK_LABELS } from "@/lib/leads/checks";
import { scoreOf, verdictOf } from "@/lib/leads/score";

const TIER = { hot: "Hot", warm: "Warm", skip: "Skip" } as const;

export function ImportLeads() {
  const [csv, setCsv] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [done, setDone] = useState<{ ok: true; added: number } | { ok: false; error: string } | null>(null);
  const [pending, start] = useTransition();

  async function onFile(file: File | undefined) {
    setPreview(null);
    setDone(null);
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    setName(file.name);
    start(async () => setPreview(await previewLeadsImport(text)));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="csv" className="field-label block">CSV file</label>
        <p id="csv-hint" className="max-w-3xl text-sm text-muted">
          The header starts with the same 28 columns as Export CSV, optionally followed by scorer columns named exactly as the checks
          (for example “{CHECK_LABELS[0]!.label}”) with Yes or No. Score and Tier are recomputed from those checks. Up to 200 rows.
        </p>
        <input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          aria-describedby="csv-hint"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="block min-h-11 w-full max-w-xl rounded-md border border-line bg-surface p-2 text-base"
        />
      </div>

      {pending && !preview && <p role="status">Reading {name}…</p>}

      {preview && !preview.ok && (
        <p role="alert" className="flex items-center gap-2"><AlertIcon /> {preview.error}</p>
      )}

      {preview?.ok && !done?.ok && (
        <section aria-labelledby="preview-h" className="space-y-4">
          <h2 id="preview-h" className="text-2xl">Preview</h2>
          <p role="status">
            {preview.add.length} to add · {preview.duplicates.length} duplicate{preview.duplicates.length === 1 ? "" : "s"} skipped · {preview.errors.length} with errors
          </p>
          {preview.add.length > 0 && (
            <TableWrap label="Rows to add" minWidth={720}>
              <thead><tr>{["Line", "Business", "Where", "Email", "Stage", "Score", "Tier"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {preview.add.map(({ line, lead }) => {
                  const score = scoreOf(CHECK_LABELS.map((c) => !!lead.checks[c.field]));
                  return (
                    <tr key={line}>
                      <td className={`${td} tabular-nums`}>{line}</td>
                      <td className={`${td} font-medium text-head`}>{lead.business_name}</td>
                      <td className={td}>{[lead.city, lead.state].filter(Boolean).join(", ")}</td>
                      <td className={td}>{lead.email || "—"}</td>
                      <td className={td}>{lead.stage.replace(/_/g, " ")}</td>
                      <td className={`${td} tabular-nums`}>{score} / 10</td>
                      <td className={td}>{TIER[verdictOf(score)]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
          {preview.duplicates.length > 0 && (
            <TableWrap label="Duplicates, skipped" minWidth={480}>
              <thead><tr>{["Line", "Business", "Already in your leads by"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
              <tbody>{preview.duplicates.map((d) => <tr key={d.line}><td className={`${td} tabular-nums`}>{d.line}</td><td className={td}>{d.business}</td><td className={td}>{d.matchedOn}</td></tr>)}</tbody>
            </TableWrap>
          )}
          {preview.errors.length > 0 && (
            <TableWrap label="Rows with errors, not imported" minWidth={600}>
              <thead><tr>{["Line", "Business", "Problem"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
              <tbody>{preview.errors.map((e) => <tr key={e.line}><td className={`${td} tabular-nums`}>{e.line}</td><td className={td}>{e.business || "—"}</td><td className={td}>{e.error}</td></tr>)}</tbody>
            </TableWrap>
          )}
          {preview.add.length > 0 && csv && (
            <Button disabled={pending} onClick={() => start(async () => setDone(await importLeads(csv)))}>
              {pending ? "Importing…" : `Import ${preview.add.length} lead${preview.add.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </section>
      )}

      {done && (done.ok
        ? <p role="status" className="flex items-center gap-2"><CheckIcon /> Imported {done.added} lead{done.added === 1 ? "" : "s"}. <Link href="/leads">Back to your leads</Link></p>
        : <p role="alert" className="flex items-center gap-2"><AlertIcon /> {done.error}</p>)}
    </div>
  );
}
