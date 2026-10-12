"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptAssignment } from "@/app/team/actions";
import { Button } from "@/components/ui/Button";
import { AlertIcon } from "@/components/ui/Icons";

export function AcceptButton({ id, business }: { id: string; business: string }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        disabled={pending}
        onClick={() => start(async () => {
          const r = await acceptAssignment(id);
          if (r?.ok) router.refresh(); else setErr(r?.message ?? "");
        })}
      >
        {pending ? "Accepting…" : "Accept"}<span className="sr-only"> {business}</span>
      </Button>
      {err && <span className="flex items-center gap-1" role="alert"><AlertIcon />{err}</span>}
    </span>
  );
}
