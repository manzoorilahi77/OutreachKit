// POST /api/it/finder/run: the IT finder. The same Google Maps scraper as the lead finder, run over an IT category and saved
// into IT Prospects' own tables (store.it().finder()). Nothing becomes a lead; a person adds results to prospects by hand.
// Streams progress as Server-Sent Events. Only one browser runs at a time on this server, whichever finder started it.
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { finderLock, parseItRunRequest } from "@/lib/it/finderHttp";
import { checkIt } from "@/lib/it/server";
import { sameOrigin, sseFrame } from "@/lib/scrape/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 3600;

export async function POST(request: Request) {
  if (!sameOrigin(request.headers)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const c = await checkIt("it.finder");
  if (!c.ok) return NextResponse.json({ enabled: false }, { status: 404 });

  const parsed = parseItRunRequest(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (finderLock.__leadfinderRunning) return NextResponse.json({ error: "A finder run is already in progress on this server. Try again when it ends." }, { status: 409 });

  const { runScrape } = await import("@/lib/scrape/scraper");
  const v = parsed.value;
  const encoder = new TextEncoder();
  const ac = new AbortController();
  request.signal.addEventListener("abort", () => ac.abort(), { once: true });
  finderLock.__leadfinderRunning = true;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (frame: string) => { try { controller.enqueue(encoder.encode(frame)); } catch { /* the client has gone */ } };
      try {
        await runScrape({
          finder: c.store.it().finder(), category: v.category, city: v.city, state: v.state, limit: v.limit, signal: ac.signal,
          headed: process.env.SCRAPE_HEADED === "1",
          onEvent: (e) => send(sseFrame(e)),
        });
      } catch {
        send(sseFrame({ type: "failed", message: "The run couldn't save to the database." }));
      } finally {
        finderLock.__leadfinderRunning = false;
        try { revalidatePath("/it", "layout"); } catch { /* not in a request scope */ }
        try { controller.close(); } catch { /* already closed */ }
      }
    },
    cancel() { ac.abort(); },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
