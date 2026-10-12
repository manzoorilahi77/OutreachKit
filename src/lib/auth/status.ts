import type { UserFile, UserStatus } from "@/lib/store/types";

/** A suspension lifts itself the day after its end date: no file is rewritten, the status is simply computed. */
export function effectiveStatus(u: Pick<UserFile, "status" | "suspendedUntil">, today: string): UserStatus {
  if (u.status === "suspended" && u.suspendedUntil && u.suspendedUntil < today) return "active";
  return u.status;
}

export const firstName = (fullName: string, fallback = ""): string => fullName.trim().split(/\s+/)[0] || fallback;
