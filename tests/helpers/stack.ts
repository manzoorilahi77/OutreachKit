import { readFileSync } from "node:fs";

/** Reads .env.local (written by `pnpm stack up`). */
export function localEnv(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(".env.local", "utf8").split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
    );
  } catch {
    return {};
  }
}

export async function stackIsUp(): Promise<boolean> {
  const url = localEnv().NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return false;
  try {
    return (await fetch(`${url}/auth/v1/health`)).ok;
  } catch {
    return false;
  }
}
