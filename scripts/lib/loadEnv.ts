import { existsSync } from "node:fs";

/** Loads .env.local the way Next does, without overriding variables already set in the shell. */
export function loadLocalEnv(file = ".env.local") {
  if (existsSync(file)) process.loadEnvFile(file);
}
