// team/schema.json holds the file-format version. Files from an older format are migrated forward on load,
// in memory: a teammate's app never rewrites another person's files. Data from a newer format is refused, because
// this copy of the app can't read it safely: pulling the latest code fixes that.
import { SCHEMA_VERSION } from "./types";
import type { SchemaName } from "./schemas";

export type Migration = (kind: SchemaName, data: unknown) => unknown;

/** Migration N upgrades a file from version N to N+1. Empty while the format is at version 1. */
export const MIGRATIONS: Record<number, Migration> = {};

export class FormatTooNewError extends Error {
  constructor(readonly found: number, readonly supported: number) {
    super(`The team data is format ${found}, but this copy of the app reads up to ${supported}. Pull the latest code.`);
  }
}

export function migrateData(kind: SchemaName, data: unknown, from: number, migrations: Record<number, Migration> = MIGRATIONS, to = SCHEMA_VERSION): unknown {
  if (from > to) throw new FormatTooNewError(from, to);
  let v = data;
  for (let n = from; n < to; n++) {
    const m = migrations[n];
    if (!m) throw new Error(`No migration from format ${n} to ${n + 1}.`);
    v = m(kind, v);
  }
  return v;
}
