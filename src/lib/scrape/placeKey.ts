// The duplicate key. Two listings are the same business when they have the same key.

/**
 * A stable key for a Maps place URL, in order of preference: the feature id (`!1s0x…:0x…`, present in result links and in
 * the opened place's address), the place id (`ChIJ…`), the legacy `cid`, then the URL path itself. Returns null for
 * something that is not a Maps place link.
 */
export function placeKey(url: string): string | null {
  let decoded = url.trim();
  if (!decoded) return null;
  try { decoded = decodeURIComponent(decoded); } catch { /* keep the raw text */ }
  const fid = /!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i.exec(decoded);
  if (fid) return "fid:" + fid[1]!.toLowerCase();
  const pid = /(ChIJ[\w-]{10,})/.exec(decoded);
  if (pid) return "place:" + pid[1]!;
  const cid = /[?&]cid=(\d+)/.exec(decoded);
  if (cid) return "cid:" + cid[1]!;
  try {
    const u = new URL(url);
    if (!u.pathname.startsWith("/maps/place/")) return null;
    return "path:" + decodeURIComponent(u.pathname).replace(/\/+$/, "").toLowerCase();
  } catch {
    return null;
  }
}

/** The link worth keeping: the place path without Maps' tracking query (`authuser`, `g_ep`, `rclk`). */
export function cleanMapsUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}
