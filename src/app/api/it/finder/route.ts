// GET /api/it/finder[?cat=&st=&city=]: the IT finder's state for this person: today's count and the saved businesses for a search.
// Answers 404 when IT Prospects is switched off or the role can't run the IT finder.
import { NextResponse } from "next/server";
import { checkIt } from "@/lib/it/server";
import { isRegion } from "@/lib/market/regions";
import { localDay } from "@/lib/scrape/limits";
import { sameOrigin } from "@/lib/scrape/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!sameOrigin(request.headers)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const c = await checkIt("it.finder");
  if (!c.ok) return NextResponse.json({ enabled: false }, { status: 404 });
  const q = new URL(request.url).searchParams;
  const category = q.get("cat") ?? "";
  const city = (q.get("city") ?? "").trim();
  const state = (q.get("st") ?? "").toUpperCase();
  const day = localDay();
  try {
    const finder = c.store.it().finder();
    const savedToday = await finder.countSavedOn(day);
    const rows = category && city && isRegion(state) ? await finder.listBusinesses({ category, city, state }) : [];
    return NextResponse.json({ enabled: true, day, savedToday, rows });
  } catch {
    return NextResponse.json({ enabled: true, error: "Couldn't read the saved businesses." }, { status: 503 });
  }
}
