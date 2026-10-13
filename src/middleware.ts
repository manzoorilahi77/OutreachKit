// The gate. Signed out, the only page is /login. Then, in order: a password still to set → /account/password;
// a paused or turned-off account → /no-access; otherwise the route map's permission decides.
// It runs on Node (it reads the account's rev and status from the database on every request). Pages and actions check again.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME } from "@/lib/auth/cookie";
import { can } from "@/lib/auth/permissions";
import { ruleFor } from "@/lib/auth/routes";
import { sessionSecret } from "@/lib/auth/secret";
import { resolveSession } from "@/lib/auth/session";
import { now } from "@/lib/clock";
import { createStore } from "@/lib/store";

export async function middleware(request: NextRequest) {
  // Server actions and form posts are checked inside the action (checkPerm); the gate is for page and API loads.
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const rule = ruleFor(pathname);
  const api = pathname.startsWith("/api/");
  const go = (to: string) => NextResponse.redirect(new URL(to, request.url));
  const refuse = (status: number) => NextResponse.json({ error: "Not allowed." }, { status });

  if (rule === "public") return NextResponse.next();

  const r = await resolveSession(request.cookies.get(COOKIE_NAME)?.value, {
    store: createStore(null), forActor: (a) => createStore(a), secret: sessionSecret(), now: now(),
  });

  if (r.kind === "none") {
    if (api) return refuse(401);
    const res = go(pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname + search)}`);
    if (request.cookies.get(COOKIE_NAME)) res.cookies.delete(COOKIE_NAME);
    return res;
  }
  if (r.kind === "no_access") return pathname === "/no-access" ? NextResponse.next() : api ? refuse(403) : go("/no-access");

  const s = r.session;
  if (s.mustChangePassword) return pathname === "/account/password" ? NextResponse.next() : api ? refuse(403) : go("/account/password");
  if (rule !== "session" && !can(s, rule)) return api ? refuse(403) : go(s.home);
  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|brand/|favicon.ico).*)"],
};
