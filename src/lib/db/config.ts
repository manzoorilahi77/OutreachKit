// Where the database is and who the app connects as. Everything comes from environment variables, never from a file in the repo.
export interface DbConfig { host: string; port: number; user: string; password: string; database: string }

const REQUIRED = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"] as const;

/** Reads DB_HOST, DB_PORT (default 3306), DB_USER, DB_PASSWORD and DB_NAME. The error names the missing variables and never prints a value. */
export function dbConfigFromEnv(env: Record<string, string | undefined> = process.env): DbConfig {
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length) throw new Error(`The database isn't set up. Missing environment variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. See .env.example.`);
  const port = Number(env.DB_PORT ?? 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("DB_PORT must be a port number.");
  return { host: env.DB_HOST!, port, user: env.DB_USER!, password: env.DB_PASSWORD!, database: env.DB_NAME! };
}

export const hasDbConfig = (env: Record<string, string | undefined> = process.env): boolean => REQUIRED.every((k) => !!env[k]);
