// The pieces of sign-in that keep their state in the database, plus the production rules for the secret and the clock.
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { dbFailureLog, MAX_FAILURES, SignInLimiter, WINDOW_MS } from "@/lib/auth/rateLimit";
import { readSignIns, recordSignIn } from "@/lib/auth/lastSignIn";
import { sessionSecret } from "@/lib/auth/secret";
import { authenticate, SIGNIN_ERROR } from "@/lib/auth/signin";
import { hashPassword } from "@/lib/auth/password";
import { now } from "@/lib/clock";
import { setPasswordAsOperator } from "@/lib/store/mysqlBootstrap";
import { mysqlBackend, mysqlConfigured } from "./contract/mysqlBackend";

describe.skipIf(!mysqlConfigured)("sign-in state in MySQL", () => {
  let db: Awaited<ReturnType<typeof mysqlBackend>>;
  beforeAll(async () => { db = await mysqlBackend(); await db.initOwner(); });
  afterAll(() => db.cleanup());

  it("locks a name after five failures for fifteen minutes, whether or not it exists", async () => {
    const l = new SignInLimiter(dbFailureLog(db.pool));
    const t0 = Date.parse("2026-10-01T09:00:00Z");
    for (let i = 0; i < MAX_FAILURES; i++) {
      expect(await l.lockedUntil("Nobody.Here", t0 + i * 1000)).toBeNull();
      await l.fail("Nobody.Here", t0 + i * 1000);
    }
    expect(await l.lockedUntil("nobody.here", t0 + 10_000)).toBe(t0 + 4000 + WINDOW_MS);
    await l.fail("nobody.here", t0 + 20_000); // during a lock: doesn't extend it
    expect(await l.lockedUntil("nobody.here", t0 + 30_000)).toBe(t0 + 4000 + WINDOW_MS);
    expect(await l.lockedUntil("someone.else", t0 + 30_000)).toBeNull();
    expect(await l.lockedUntil("nobody.here", t0 + 4000 + WINDOW_MS)).toBeNull(); // lifts by itself
  });
  it("a success clears the count", async () => {
    const l = new SignInLimiter(dbFailureLog(db.pool));
    const t0 = Date.parse("2026-10-02T09:00:00Z");
    for (let i = 0; i < 4; i++) await l.fail("ravi", t0 + i);
    await l.clear("ravi");
    for (let i = 0; i < 4; i++) await l.fail("ravi", t0 + 10 + i);
    expect(await l.lockedUntil("ravi", t0 + 100)).toBeNull();
  });
  it("an operator can set a lost password: it works at once, ends sessions, lifts the lock and leaves an audit line", async () => {
    const store = db.storeFor(null);
    const before = (await store.getUser("owner"))!;
    const limiter = new SignInLimiter(dbFailureLog(db.pool));
    const t0 = Date.now();
    for (let i = 0; i < MAX_FAILURES; i++) await limiter.fail("owner", t0 + i);
    expect(await limiter.lockedUntil("owner", t0 + 10)).not.toBeNull();
    await setPasswordAsOperator(db.pool, "owner", await hashPassword("A-fresh-operator-pass-1"));
    const after = (await store.getUser("owner"))!;
    expect(after.rev).toBe(before.rev + 1); // a signed-in session carries the old rev and ends
    expect(after.pwRev).toBe(before.pwRev);
    expect(await limiter.lockedUntil("owner", t0 + 10)).toBeNull();
    const ok = await authenticate({ store, limiter, username: "owner", password: "A-fresh-operator-pass-1", now: new Date() });
    expect(ok).toMatchObject({ ok: true, mustChangePassword: false });
    expect(await authenticate({ store, limiter, username: "owner", password: "owner-password-1", now: new Date() })).toEqual({ ok: false, message: SIGNIN_ERROR });
    const audit = await db.storeFor({ username: "owner", role: "super_admin", team: null }).listAudit();
    expect(audit.some((e) => e.action === "account.password_set_by_operator" && e.target === "owner")).toBe(true);
    await expect(setPasswordAsOperator(db.pool, "nobody.here", "x")).rejects.toThrow(/No account/);
  });
  it("remembers when each person last signed in", async () => {
    await recordSignIn(db.pool, "owner", "2026-10-13T10:23:15.368Z");
    await recordSignIn(db.pool, "owner", "2026-10-14T08:00:00.000Z");
    expect(await readSignIns(db.pool)).toEqual({ owner: "2026-10-14T08:00:00.000Z" });
  });
});

describe("the session secret", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("comes from SESSION_SECRET and must be long enough", () => {
    vi.stubEnv("SESSION_SECRET", "x".repeat(40));
    expect(sessionSecret()).toBe("x".repeat(40));
    vi.stubEnv("SESSION_SECRET", "short");
    expect(() => sessionSecret()).toThrow(/at least 32/);
  });
  it("is required in production", () => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => sessionSecret()).toThrow(/SESSION_SECRET is not set/);
  });
});

describe("the clock", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("ignores an offset unless the test switch is on", () => {
    vi.stubEnv("OKIT_CLOCK_OFFSET_MS", String(5 * 86_400_000));
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(1000);
    vi.stubEnv("OKIT_ALLOW_CLOCK_OVERRIDE", "1");
    expect(now().getTime() - Date.now()).toBeGreaterThan(4.9 * 86_400_000);
  });
});
