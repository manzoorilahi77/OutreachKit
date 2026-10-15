// GET /it/export.csv: the prospects the person may export, one row each with its newest signal. Audited.
import { checkIt } from "@/lib/it/server";
import { prospectsToCsv } from "@/lib/it/csv";
import { todayIso } from "@/lib/clock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const c = await checkIt("it.export");
  if (!c.ok) return new Response(c.message, { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const [rows, dir] = await Promise.all([c.store.it().exportProspects(), c.store.directory()]);
  const names = new Map(dir.map((d) => [d.username, d.fullName]));
  return new Response("﻿" + prospectsToCsv(rows, (u) => names.get(u) ?? u), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="it-prospects-${todayIso()}.csv"`, "Cache-Control": "no-store" },
  });
}
