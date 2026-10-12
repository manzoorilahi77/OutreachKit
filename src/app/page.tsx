import { redirect } from "next/navigation";
import { requirePerm } from "@/lib/auth/server";

/** `/` sends each person to their home. */
export default async function Home() {
  const s = await requirePerm("session");
  redirect(s.home);
}
