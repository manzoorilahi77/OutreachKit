// When each person last signed in (shown on the Users page), kept in the database.
import type { Pool, RowDataPacket } from "mysql2/promise";
import { fromDbTime, toDbTime } from "@/lib/db/time";

export async function readSignIns(pool: Pool): Promise<Record<string, string>> {
  const [r] = await pool.query<RowDataPacket[]>("SELECT username, signed_in_at FROM user_signins");
  return Object.fromEntries(r.map((x) => [x.username as string, fromDbTime(x.signed_in_at)]));
}

export async function recordSignIn(pool: Pool, username: string, iso: string): Promise<void> {
  await pool.query("INSERT INTO user_signins (username, signed_in_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE signed_in_at = VALUES(signed_in_at)", [username, toDbTime(iso)]);
}
