// One connection pool per process. It lives on globalThis because Next bundles the middleware, pages and route handlers
// separately, and each bundle must share the same pool instead of opening its own.
import mysql, { type Pool } from "mysql2/promise";
import { dbConfigFromEnv, type DbConfig } from "./config";

const g = globalThis as { __okitPools?: Map<string, Pool> };
const pools = (g.__okitPools ??= new Map<string, Pool>());

export function createPool(c: DbConfig, connectionLimit = 10): Pool {
  return mysql.createPool({
    host: c.host, port: c.port, user: c.user, password: c.password, database: c.database,
    charset: "utf8mb4", timezone: "Z", dateStrings: true, supportBigNumbers: true, bigNumberStrings: false,
    connectionLimit, waitForConnections: true, enableKeepAlive: true,
  });
}

/** The shared pool for the app's database (from the environment). */
export function getPool(): Pool {
  const c = dbConfigFromEnv();
  const key = `${c.host}:${c.port}/${c.database}/${c.user}`;
  let p = pools.get(key);
  if (!p) {
    p = createPool(c);
    pools.set(key, p);
  }
  return p;
}
