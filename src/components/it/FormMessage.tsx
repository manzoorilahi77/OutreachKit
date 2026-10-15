import { AlertIcon, CheckIcon } from "@/components/ui/Icons";

/** The answer a form gets back: a status when it worked, an alert when it didn't. */
export function FormMessage({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p className="flex items-start gap-2" role={state.ok ? "status" : "alert"}>
      {state.ok ? <CheckIcon className="mt-1 shrink-0" /> : <AlertIcon className="mt-1 shrink-0" />}
      <span>{state.message}</span>
    </p>
  );
}
