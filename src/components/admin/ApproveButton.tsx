"use client";

import { useActionState } from "react";
import { approveContentAction, type AccountState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";

export function ApproveButton({ fileId, version, label }: { fileId: string; version: string; label: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(approveContentAction, null);
  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="kind" value="category-kit" />
      <input type="hidden" name="fileId" value={fileId} />
      <input type="hidden" name="version" value={version} />
      <Button variant="secondary" type="submit" disabled={pending || state?.ok === true}>
        {state?.ok ? "Approved" : pending ? "Saving…" : "Approve"}<span className="sr-only"> {label} version {version}</span>
      </Button>
      {state && !state.ok && <span className="flex items-center gap-1" role="alert"><AlertIcon />{state.message}</span>}
      {state?.ok && <CheckIcon />}
    </form>
  );
}
