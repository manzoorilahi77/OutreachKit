// POST /api/leadfinder/run: starts a Google Maps run and streams its progress as Server-Sent Events.
// The body is {category, state, city, limit}. Closing the connection (or the Stop button) ends the run, keeping what it saved.
// Runs on this machine only: it launches Chromium. Results are saved to the signed-in person's folder.
import { NextResponse } from "next/server";
import { checkPerm } from "@/lib/auth/server";
import { parseRunRequest, sameOrigin, sseFrame } from "@/lib/scrape/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 3600;

const g = globalThis as { __leadfinderRunning?: boolean };

export async function POST(request: Request) {
  if (!sameOrigin(request.headers)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const c = await checkPerm("finder.run");
  if (!c.ok || !(await c.store.getWorkspace()).features.leadFinder) return NextResponse.json({ enabled: false }, { status: 404 });

  const parsed = parseRunRequest(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (g.__leadfinderRunning) return NextResponse.json({ error: "A run is already in progress." }, { status: 409 });

  const { runScrape } = await import("@/lib/scrape/scraper");
  const { value: v } = parsed;
  const encoder = new TextEncoder();
  const ac = new AbortController();
  request.signal.addEventListener("abort", () => ac.abort(), { once: true });
  g.__leadfinderRunning = true;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (frame: string) => { try { controller.enqueue(encoder.encode(frame)); } catch { /* the client has gone */ } };
      try {
        await runScrape({
          finder: c.store.finder(), category: v.category, city: v.city, state: v.state, limit: v.limit, signal: ac.signal,
          headed: process.env.SCRAPE_HEADED === "1",
          onEvent: (e) => send(sseFrame(e)),
        });
      } catch {
        send(sseFrame({ type: "failed", message: "The run couldn't save to your folder." }));
      } finally {
        g.__leadfinderRunning = false;
        try { controller.close(); } catch { /* already closed */ }
      }
    },
    cancel() { ac.abort(); },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
