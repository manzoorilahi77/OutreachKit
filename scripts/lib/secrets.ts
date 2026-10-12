// What `pnpm secrets:check` looks for. Pure, so a test can feed it a fake repo.

/** Keys that would hold a password in the clear. The hashes (`passwordHash`, `tempPasswordHash`) are named differently on purpose. */
export const PLAIN_KEYS = /^(password|passwd|pwd|plainPassword|plaintextPassword|clearPassword|tempPassword|temporaryPassword|secret|sessionSecret)$/i;

export interface Repo {
  /** `git ls-files`: what is tracked. */
  tracked: string[];
  /** Files under team/ in the working tree (tracked or not), so a mistake is caught before it is committed. */
  teamFiles: string[];
  read(path: string): string | null;
}

function plainKeyIn(value: unknown, trail = ""): string | null {
  if (Array.isArray(value)) {
    for (const v of value) { const r = plainKeyIn(v, trail); if (r) return r; }
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (PLAIN_KEYS.test(k) && typeof v === "string" && v !== "") return trail + k;
      const r = plainKeyIn(v, trail + k + ".");
      if (r) return r;
    }
  }
  return null;
}

export function findProblems(repo: Repo): string[] {
  const out: string[] = [];
  for (const f of repo.tracked) {
    const name = f.split("/").pop()!;
    if (f.startsWith(".local/")) out.push(`${f} is tracked. Everything in .local/ stays on one laptop.`);
    else if (name === "session-secret") out.push(`${f} is tracked. A session secret must never be committed.`);
    else if (/^\.env(\..+)?$/.test(name) && name !== ".env.example") out.push(`${f} is tracked. Environment files must not be committed.`);
  }
  for (const f of repo.teamFiles) {
    if (!/\.jsonl?$/.test(f)) continue;
    const text = repo.read(f);
    if (!text) continue;
    const docs: unknown[] = [];
    if (f.endsWith(".jsonl")) {
      for (const line of text.split(/\r?\n/)) { if (!line.trim()) continue; try { docs.push(JSON.parse(line)); } catch { /* not ours to judge */ } }
    } else {
      try { docs.push(JSON.parse(text)); } catch { /* not ours to judge */ }
    }
    for (const d of docs) {
      const k = plainKeyIn(d);
      if (k) { out.push(`${f} has a plain-text "${k}" field. Only bcrypt hashes may be written.`); break; }
    }
  }
  return out;
}
