import { NextResponse } from "next/server";
import { checkPerm } from "@/lib/auth/server";
import { leadsToCsv } from "@/lib/leads/csv";

export const dynamic = "force-dynamic";

/** The leads in the person's export scope (own, team or all), with the exact 28-column header. Every export is written to their audit log. */
export async function GET() {
  const c = await checkPerm("leads.export");
  if (!c.ok) return new NextResponse("Your role can't export.", { status: 403 });
  let rows;
  try {
    rows = await c.store.exportLeads();
  } catch {
    return new NextResponse("We couldn't build the export.", { status: 500 });
  }
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(leadsToCsv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="leads-${day}.csv"`, "cache-control": "no-store" },
  });
}
