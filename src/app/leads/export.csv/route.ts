import { NextResponse } from "next/server";
import { leadsToCsv, type LeadRow } from "@/lib/leads/csv";
import { createClient, getSession } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Every lead, with the exact 28-column header, ready to paste or import into Google Sheets. */
export async function GET() {
  if (!(await getSession())) return new NextResponse("Sign in to export.", { status: 401 });
  const supabase = await createClient();
  const rows: LeadRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("leads").select("*").order("date_sourced").order("created_at").range(from, from + 999);
    if (error) return new NextResponse("We couldn't build the export.", { status: 500 });
    rows.push(...(data as unknown as LeadRow[]));
    if (data.length < 1000) break;
  }
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(leadsToCsv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="leads-${day}.csv"`, "cache-control": "no-store" },
  });
}
