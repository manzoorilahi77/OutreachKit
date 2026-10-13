import type { Pool } from "mysql2/promise";
import { createScratchDb } from "@/lib/db/scratch";
import { hasDbConfig } from "@/lib/db/config";
import { createPool } from "@/lib/db/pool";
import { createMySqlStore } from "@/lib/store/mysqlStore";
import { initWorkspaceDb } from "@/lib/store/mysqlBootstrap";
import { hash } from "../helpers/team";
import type { Backend } from "./backend";

export const mysqlConfigured = hasDbConfig();

/** A throwaway database named okit_test_<random> on the server in DB_*, with the real migrations applied. */
export const mysqlBackend = async (): Promise<Backend & { pool: Pool }> => {
  const scratch = await createScratchDb("okit_test");
  const pool = createPool(scratch.config, 8);
  return {
    pool,
    storeFor: (actor) => createMySqlStore(actor, pool),
    initOwner: async () => {
      await initWorkspaceDb(pool, {
        workspaceName: "Famysys", studio: "Famysys", demoDomain: "famysys.com", username: "owner", fullName: "Olive Owner",
        passwordHash: hash("owner-password-1"), unusableTempHash: hash("nobody-knows"),
      });
    },
    cleanup: async () => {
      await pool.end();
      await scratch.drop();
    },
  };
};
