// "Start here": which playbook sections each role reads first, in order. From the Role System page; roles it doesn't list have no path.
import type { Role } from "@/lib/auth/roles";

export const START_HERE: Partial<Record<Role, string[]>> = {
  bd: ["choose", "filter", "kitsec", "reach", "sell", "track"],
  researcher: ["board", "filter", "device"],
  manager: ["math", "track", "ninety", "filter"],
  admin: ["math", "ninety", "board"],
};
