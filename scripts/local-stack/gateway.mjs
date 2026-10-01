// Routes /auth/v1/* to GoTrue and /rest/v1/* to PostgREST, as Supabase's gateway does.
import { readFileSync } from "node:fs";
import http from "node:http";
import { resolve } from "node:path";

const port = Number(process.env.GATEWAY_PORT ?? 54321);
const targets = { "/auth/v1": Number(process.env.GOTRUE_PORT ?? 9999), "/rest/v1": Number(process.env.REST_PORT ?? 3000) };

http.createServer((req, res) => {
  res.setHeader("access-control-allow-origin", req.headers.origin ?? "*");
  res.setHeader("access-control-allow-headers", "authorization, apikey, content-type, x-client-info, prefer, range, accept-profile, content-profile");
  res.setHeader("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  // GoTrue reads its email templates over HTTP; serve the ones in supabase/templates.
  const tpl = /^\/_templates\/([a-z_]+\.html)$/.exec(req.url ?? "");
  if (tpl) {
    try { res.writeHead(200, { "content-type": "text/html" }); res.end(readFileSync(resolve("supabase/templates", tpl[1])), "utf8"); }
    catch { res.writeHead(404); res.end("not found"); }
    return;
  }
  // This GoTrue build writes email links as /verify; the hosted gateway serves them under /auth/v1.
  if (req.url?.startsWith("/verify")) req.url = "/auth/v1" + req.url;
  const prefix = Object.keys(targets).find((p) => req.url?.startsWith(p));
  if (!prefix) { res.writeHead(404); res.end("not found"); return; }
  const upstream = http.request(
    { host: "127.0.0.1", port: targets[prefix], path: req.url.slice(prefix.length) || "/", method: req.method, headers: { ...req.headers, host: `127.0.0.1:${targets[prefix]}` } },
    (r) => { res.writeHead(r.statusCode ?? 502, r.headers); r.pipe(res); },
  );
  upstream.on("error", () => { res.writeHead(502); res.end("bad gateway"); });
  req.pipe(upstream);
}).listen(port, "127.0.0.1");
