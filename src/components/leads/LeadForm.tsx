"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Select } from "@/components/ui/Field";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import { CATS } from "@/lib/kit/categories";
import { CHECK_LABELS, type CheckField } from "@/lib/leads/checks";
import { scoreOf, verdictOf, VERDICT_LABEL } from "@/lib/leads/score";
import { CHANNELS } from "@/lib/leads/stages";
import type { LeadView } from "@/lib/store/types";

type Lead = LeadView;
type Props = {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  lead?: Lead;
  kitId?: string;
  defaults?: { category?: string; city?: string; state?: string };
  submitLabel: string;
  /** A researcher contacts no one: the demo and outreach fields are hidden. */
  restricted?: boolean;
};

const Legend = ({ children }: { children: React.ReactNode }) => <legend className="mb-3 text-xl font-medium text-head">{children}</legend>;

export function LeadForm({ action, lead, kitId, defaults, submitLabel, restricted = false }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const [checks, setChecks] = useState<Record<CheckField, boolean>>(
    () => Object.fromEntries(CHECK_LABELS.map((c) => [c.field, lead ? lead[c.field] : false])) as Record<CheckField, boolean>,
  );
  const score = scoreOf(Object.values(checks));
  const verdict = verdictOf(score);
  const v = <K extends keyof Lead>(k: K, fallback = ""): string => {
    const x = lead?.[k];
    return x === null || x === undefined ? fallback : String(x);
  };

  return (
    <form action={formAction} className="space-y-8">
      {lead && <input type="hidden" name="id" value={lead.id} />}
      {kitId && <input type="hidden" name="kit_id" value={kitId} />}

      <fieldset className="space-y-4">
        <Legend>The business</Legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="business_name" label="Business name"><Input id="business_name" name="business_name" required defaultValue={v("business_name")} autoComplete="off" /></Field>
          <Field id="owner_first_name" label="Owner first name"><Input id="owner_first_name" name="owner_first_name" defaultValue={v("owner_first_name")} autoComplete="off" /></Field>
          <Field id="category" label="Category">
            <Input id="category" name="category" list="categories" defaultValue={v("category", defaults?.category ?? "")} autoComplete="off" />
            <datalist id="categories">{CATS.map((c) => <option key={c.i} value={c.n} />)}</datalist>
          </Field>
          <Field id="date_sourced" label="Date sourced"><Input id="date_sourced" name="date_sourced" type="date" defaultValue={v("date_sourced")} /></Field>
          <Field id="city" label="City"><Input id="city" name="city" defaultValue={v("city", defaults?.city ?? "")} autoComplete="off" /></Field>
          <Field id="state" label="State" hint="Two-letter code, like TX."><Input id="state" name="state" maxLength={2} defaultValue={v("state", defaults?.state ?? "")} autoComplete="off" /></Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <Legend>How to reach them</Legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="phone" label="Phone"><Input id="phone" name="phone" type="tel" defaultValue={v("phone")} autoComplete="off" /></Field>
          <Field id="email" label="Email"><Input id="email" name="email" type="email" defaultValue={v("email")} autoComplete="off" /></Field>
          <Field id="instagram_handle" label="Instagram handle"><Input id="instagram_handle" name="instagram_handle" defaultValue={v("instagram_handle")} autoComplete="off" /></Field>
          <Field id="facebook_page" label="Facebook page"><Input id="facebook_page" name="facebook_page" defaultValue={v("facebook_page")} autoComplete="off" /></Field>
          <Field id="google_maps_url" label="Google Maps URL"><Input id="google_maps_url" name="google_maps_url" defaultValue={v("google_maps_url")} autoComplete="off" /></Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <Legend>Their website and presence</Legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="website_found" label="Website found?">
            <Select id="website_found" name="website_found" defaultValue={lead?.website_found === true ? "yes" : lead?.website_found === false ? "no" : ""}>
              <option value="">Not checked</option><option value="yes">Yes</option><option value="no">No</option>
            </Select>
          </Field>
          <Field id="website_url" label="Website URL"><Input id="website_url" name="website_url" defaultValue={v("website_url")} autoComplete="off" /></Field>
          <Field id="site_verdict" label="Site verdict"><Input id="site_verdict" name="site_verdict" defaultValue={v("site_verdict")} autoComplete="off" /></Field>
          <Field id="google_review_count" label="Google review count"><Input id="google_review_count" name="google_review_count" inputMode="numeric" defaultValue={v("google_review_count")} /></Field>
          <Field id="google_rating" label="Google rating" hint="0 to 5."><Input id="google_rating" name="google_rating" inputMode="decimal" defaultValue={v("google_rating")} /></Field>
          <Field id="followers" label="Followers"><Input id="followers" name="followers" inputMode="numeric" defaultValue={v("followers")} /></Field>
          <Field id="last_post_date" label="Last post date"><Input id="last_post_date" name="last_post_date" type="date" defaultValue={v("last_post_date")} /></Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <Legend>The 30-second scorer</Legend>
        <div className="flex flex-wrap items-center gap-3" aria-live="polite">
          <span className="text-3xl font-medium text-head tabular-nums">{score} / 10</span>
          <Chip variant={verdict}>{VERDICT_LABEL[verdict]}</Chip>
        </div>
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {CHECK_LABELS.map((c) => (
            <li key={c.field}>
              <label className="flex min-h-11 cursor-pointer gap-3 p-4">
                <input
                  type="checkbox" name={c.field} checked={checks[c.field]}
                  onChange={(e) => setChecks((cur) => ({ ...cur, [c.field]: e.target.checked }))}
                  className="mt-1 size-6 shrink-0 accent-head"
                />
                <span><strong className="block">{c.label}</strong><span className="block text-muted">{c.hint}</span></span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="space-y-4">
        <Legend>{restricted ? "Notes" : "Demo and outreach"}</Legend>
        {!restricted && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="demo_url" label="Demo URL"><Input id="demo_url" name="demo_url" defaultValue={v("demo_url")} autoComplete="off" /></Field>
            <Field id="demo_built_date" label="Demo built date"><Input id="demo_built_date" name="demo_built_date" type="date" defaultValue={v("demo_built_date")} /></Field>
            <Field id="first_contact_date" label="First contact date"><Input id="first_contact_date" name="first_contact_date" type="date" defaultValue={v("first_contact_date")} /></Field>
            <Field id="channel" label="Channel">
              <Select id="channel" name="channel" defaultValue={v("channel")}>
                <option value="">Not contacted</option>
                {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
          </div>
        )}
        <Field id="notes" label="Notes"><textarea id="notes" name="notes" rows={4} defaultValue={v("notes")} className="w-full rounded-md border border-fg/60 bg-bg px-3 py-2 text-base text-fg" /></Field>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
        {state && (
          <p className="flex items-center gap-2" role={state.ok ? "status" : "alert"}>
            {state.ok ? <CheckIcon /> : <AlertIcon />}<span>{state.message}</span>
          </p>
        )}
      </div>
    </form>
  );
}
