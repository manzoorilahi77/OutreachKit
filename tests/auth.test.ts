import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SESSION_MS, signSession, verifySession } from "@/lib/auth/cookie";
import { authenticate, LOCKED_ERROR, SIGNIN_ERROR } from "@/lib/auth/signin";
import { generateTempPassword, hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { memoryFailureLog, SignInLimiter } from "@/lib/auth/rateLimit";
import { ruleFor } from "@/lib/auth/routes";
import { resolveSession } from "@/lib/auth/session";
import { effectiveStatus } from "@/lib/auth/status";
import { can } from "@/lib/auth/permissions";
import { createStore } from "@/lib/store/fileStore";
import type { Store } from "@/lib/store/store";
import { hash, seedTeam, tempRoot } from "./helpers/team";

const SECRET = "s".repeat(64);
const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date("2026-10-01T09:00:00.000Z");
let root = "";
let cleanup: () => Promise<void>;
let t: Awaited<ReturnType<typeof seedTeam>>;
let auth: Store;
const forActor = (a: Parameters<typeof createStore>[0]) => createStore(a, root);
const token = (username: string, rev: number, issuedAt = T0.getTime()) => signSession({ username, rev, issuedAt }, SECRET);
const at = (ms: number) => new Date(T0.getTime() + ms);
const resolve = (tok: string, now: Date) => resolveSession(tok, { store: auth, forActor, secret: SECRET, now });

beforeAll(async () => {
  ({ root, cleanup } = await tempRoot());
  t = await seedTeam(root);
  auth = createStore(null, root);
});
afterAll(() => cleanup());

describe("passwords", () => {
  it("hashes with bcrypt and verifies", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h).toMatch(/^\$2[aby]\$/);
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await verifyPassword("x", null)).toBe(false);
  });
  it("makes readable temporary passwords", () => {
    const p = generateTempPassword();
    expect(p).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
    expect(p).not.toMatch(/[0O1lI]/);
    expect(new Set(Array.from({ length: 50 }, generateTempPassword)).size).toBe(50);
  });
  it("wants 10 or more characters", () => {
    expect(passwordProblem("short")).toMatch(/10/);
    expect(passwordProblem("ravi-is-great", "ravi")).toMatch(/username/);
    expect(passwordProblem("a long enough one")).toBeNull();
    expect(passwordProblem("x".repeat(73))).toMatch(/at most/);
  });
});

describe("the cookie", () => {
  it("round-trips and rejects tampering", () => {
    const tok = token("ravi", 3);
    expect(verifySession(tok, SECRET)).toEqual({ username: "ravi", issuedAt: T0.getTime(), rev: 3 });
    expect(verifySession(tok, "other".repeat(13))).toBeNull();
    const [body, sig] = tok.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "owner", t: T0.getTime(), r: 1 })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(verifySession(`${body}.`, SECRET)).toBeNull();
    expect(verifySession("junk", SECRET)).toBeNull();
    expect(verifySession(undefined, SECRET)).toBeNull();
  });
});

describe("the 14-day session", () => {
  it("is open at 13 days 23 hours and ended at 14 days", async () => {
    const tok = token("ravi", 1);
    expect((await resolve(tok, at(13 * DAY + 23 * 3600_000))).kind).toBe("ok");
    expect(SESSION_MS).toBe(14 * DAY);
    expect(await resolve(tok, at(14 * DAY))).toEqual({ kind: "none", reason: "expired" });
    expect(await resolve(tok, at(20 * DAY))).toEqual({ kind: "none", reason: "expired" });
  });
  it("carries the user, team, perms and home", async () => {
    const r = await resolve(token("mia", 1), at(1000));
    expect(r.kind === "ok" && r.session).toMatchObject({ user: { username: "mia", role: "manager" }, team: { id: "team-a" }, home: "/team", mustChangePassword: true });
    expect(r.kind === "ok" && can(r.session, "leads.assign")).toBe(true);
    expect(r.kind === "ok" && r.session.perms["leads.view"]).toEqual({ scope: "team" });
  });
  it("ends when the account's rev changes", async () => {
    const tok = token("asha", (await auth.getUser("asha"))!.rev);
    expect((await resolve(tok, at(1000))).kind).toBe("ok");
    await t.owner.changeUser("asha", { type: "change_role", role: "bd" });
    expect(await resolve(tok, at(1000))).toEqual({ kind: "none", reason: "rev_changed" });
  });
  it("ends on suspension and shows the no-access page with the reason and date", async () => {
    const tok = token("meera", (await auth.getUser("meera"))!.rev);
    await t.owner.changeUser("meera", { type: "suspend", reason: "On leave", until: "2026-12-31" });
    const r = await resolve(tok, at(1000));
    expect(r).toMatchObject({ kind: "no_access", status: "suspended", reason: "On leave", until: "2026-12-31" });
  });
  it("lets a suspended person sign in again once the end date has passed", async () => {
    const limiter = new SignInLimiter(memoryFailureLog());
    const before = await authenticate({ store: auth, limiter, username: "meera", password: "temp-meera", now: new Date("2026-12-31T12:00:00Z") });
    expect(before).toEqual({ ok: false, message: SIGNIN_ERROR });
    const after = await authenticate({ store: auth, limiter, username: "meera", password: "temp-meera", now: new Date("2027-01-01T00:00:01Z") });
    expect(after.ok).toBe(true);
    expect(effectiveStatus({ status: "suspended", suspendedUntil: "2026-12-31" }, "2027-01-01")).toBe("active");
    expect(effectiveStatus({ status: "suspended", suspendedUntil: null }, "2099-01-01")).toBe("suspended");
    // And a cookie issued after the suspension began works again, because the date has passed and rev matches.
    const u = (await auth.getUser("meera"))!;
    expect((await resolve(token("meera", u.rev, new Date("2027-01-01T00:00:02Z").getTime()), new Date("2027-01-01T00:01:00Z"))).kind).toBe("ok");
  });
  it("ends on disable, and for a user that no longer exists or a forged name", async () => {
    await t.owner.changeUser("bryn", { type: "disable" });
    expect((await resolve(token("bryn", 1), at(1000))).kind).toBe("no_access");
    expect(await resolve(token("nobody", 1), at(1000))).toEqual({ kind: "none", reason: "gone" });
    expect(await resolve("garbage", at(1000))).toEqual({ kind: "none", reason: "bad_cookie" });
    expect(await resolve(token("ravi", 1, at(10 * 60_000).getTime()), at(0))).toEqual({ kind: "none", reason: "bad_cookie" });
  });
});

describe("sign-in", () => {
  const log = memoryFailureLog();
  const limiter = () => new SignInLimiter(log);
  const go = (username: string, password: string, now = T0) => authenticate({ store: auth, limiter: limiter(), username, password, now });

  it("accepts the temporary password at first and asks for a new one", async () => {
    expect(await go("ravi", "temp-ravi")).toMatchObject({ ok: true, mustChangePassword: true });
    expect(await go(" RAVI ", "temp-ravi")).toMatchObject({ ok: true });
  });
  it("accepts the person's own password once set, and stops accepting the temporary one", async () => {
    const ravi = (await auth.getUser("ravi"))!;
    await t.ravi.setOwnPassword(hash("my own secret pw"), ravi.pwRev);
    expect(await go("ravi", "my own secret pw")).toMatchObject({ ok: true, mustChangePassword: false });
    expect(await go("ravi", "temp-ravi")).toEqual({ ok: false, message: SIGNIN_ERROR });
  });
  it("a suspension or role change leaves the own password working; a reset brings the temporary one back", async () => {
    await t.owner.changeUser("ravi", { type: "change_role", role: "bd" });
    expect(await go("ravi", "my own secret pw")).toMatchObject({ ok: true, mustChangePassword: false });
    await t.owner.changeUser("ravi", { type: "reset_password", tempPasswordHash: hash("fresh-temp-pw") });
    expect(await go("ravi", "my own secret pw")).toEqual({ ok: false, message: SIGNIN_ERROR });
    expect(await go("ravi", "fresh-temp-pw")).toMatchObject({ ok: true, mustChangePassword: true });
  });
  it("gives one error for a wrong password, an unknown user, and a disabled account", async () => {
    const msgs = [await go("ada", "nope"), await go("ghost", "nope"), await go("bryn", "temp-bryn"), await go("", "")];
    for (const m of msgs) expect(m).toEqual({ ok: false, message: SIGNIN_ERROR });
  });
  it("locks a username for 15 minutes after 5 failures in 15 minutes, on this laptop", async () => {
    const lim = limiter();
    for (let i = 0; i < 5; i++) expect(await authenticate({ store: auth, limiter: lim, username: "vic", password: "bad", now: at(i * 1000) })).toEqual({ ok: false, message: SIGNIN_ERROR });
    // Even the right password is refused during the lock.
    expect(await authenticate({ store: auth, limiter: lim, username: "vic", password: "temp-vic", now: at(60_000) })).toEqual({ ok: false, message: LOCKED_ERROR });
    expect(await authenticate({ store: auth, limiter: lim, username: "vic", password: "temp-vic", now: at(14 * 60_000) })).toEqual({ ok: false, message: LOCKED_ERROR });
    // 15 minutes after the 5th failure it lifts.
    expect((await authenticate({ store: auth, limiter: lim, username: "vic", password: "temp-vic", now: at(4000 + 15 * 60_000) })).ok).toBe(true);
    // Other usernames were never affected.
    expect((await go("ada", "temp-ada", at(60_000))).ok).toBe(true);
  });
  it("counts failures only inside the 15 minute window", async () => {
    const lim = limiter();
    for (let i = 0; i < 4; i++) await authenticate({ store: auth, limiter: lim, username: "asha", password: "bad", now: at(i * 1000) });
    // 16 minutes later the old failures no longer count.
    await authenticate({ store: auth, limiter: lim, username: "asha", password: "bad", now: at(16 * 60_000) });
    expect((await authenticate({ store: auth, limiter: lim, username: "asha", password: "temp-asha", now: at(16 * 60_000 + 1000) })).ok).toBe(true);
  });
});

describe("the route map", () => {
  it.each([
    ["/login", "public"], ["/", "session"], ["/no-access", "session"], ["/account/password", "session"],
    ["/console", "kits.build"], ["/today", "kits.save"], ["/team", "leads.assign"], ["/queue", "leads.assign"], ["/handover", "leads.handover"],
    ["/admin", "workspace.manage"], ["/admin/users", "users.create"], ["/admin/audit", "audit.view"], ["/admin/settings", "workspace.manage"],
    ["/platform", "content.approve"], ["/platform/users", "content.approve"], ["/sourcing", "finder.run"], ["/reports", "reports.view"],
    ["/kits", "kits.view"], ["/kits/abc", "kits.view"], ["/leads", "leads.view"], ["/leads/new", "leads.add"], ["/leads/import", "leads.add"],
    ["/leads/export.csv", "leads.export"], ["/leads/abc", "leads.view"], ["/playbook", "playbook.read"], ["/playbook/math", "playbook.read"],
    ["/playbook/progress", "playbook.required"], ["/review", "review.weekly"], ["/api/leadfinder/run", "finder.run"], ["/team-x", "session"],
  ])("%s needs %s", (p, rule) => expect(ruleFor(p)).toBe(rule));
});
