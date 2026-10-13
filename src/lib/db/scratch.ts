// A throwaway database for tests and the browser scripts: created next to the app's database on the same server
// (the DB user needs CREATE and DROP on databases named okit_%), migrated with the real migration files, dropped when done.
import { randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import { dbConfigFromEnv, type DbConfig } from "./config";
import { migrate } from "./migrate";

export interface ScratchDb { config: DbConfig; drop(): Promise<void> }

export async function createScratchDb(prefix = "okit_test"): Promise<ScratchDb> {
  const base = dbConfigFromEnv({ ...process.env, DB_NAME: "unused" });
  const name = `${prefix}_${randomBytes(4).toString("hex")}`;
  const admin = await mysql.createConnection({ host: base.host, port: base.port, user: base.user, password: base.password, charset: "utf8mb4" });
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);
  const config = { ...base, database: name };
  try {
    await migrate(config);
  } catch (e) {
    await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await admin.end();
    throw e;
  }
  return {
    config,
    drop: async () => {
      await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
      await admin.end();
    },
  };
}
