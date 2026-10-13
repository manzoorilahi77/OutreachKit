// The Store the app runs on: MySQL, over the shared pool. Pages, actions, the middleware and the scripts all start here.
import { getPool } from "@/lib/db/pool";
import { createMySqlStore } from "./mysqlStore";
import type { Store } from "./store";
import type { Actor } from "./types";

/** A Store for this person; pass null for the sign-in Store, which can read accounts and nothing else. */
export function createStore(actor: Actor | null): Store {
  return createMySqlStore(actor, getPool());
}
