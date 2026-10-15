"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { SEGMENTS, SIGNAL_TYPES, TEAM_SIZES, type ItProspectView, type Segment } from "@/lib/it/model";
import { COUNTRIES, COUNTRY_CODES, regionOptions, type Country } from "@/lib/market/regions";
import { FormMessage } from "./FormMessage";

const area = "w-full rounded-md border border-fg/60 bg-bg px-3 py-2 text-base text-fg";

/** The prospect's details. A new prospect can carry its first signal; an existing one adds signals on its page. */
export function ProspectForm({ action, prospect, submitLabel, withSignal, today }: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  prospect?: ItProspectView;
  submitLabel: string;
  withSignal?: boolean;
  today: string;
}) {
  const [state, run, pending] = useActionState(action, null);
  const [country, setCountry] = useState<Country>(prospect?.country ?? "US");
  const [segment, setSegment] = useState<Segment>(prospect?.segment ?? "buyer");
  const p = prospect;
  const text = (name: string, label: string, value = "", props: Record<string, unknown> = {}) => (
    <Field id={`pf-${name}`} label={label}><Input id={`pf-${name}`} name={name} defaultValue={value} {...props} /></Field>
  );

  return (
    <form action={run} className="space-y-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <fieldset className="space-y-4">
        <legend className="mb-2 text-xl">Company</legend>
        <div className="grid gap-4 md:grid-cols-2">
          {text("company", "Company name", p?.company, { required: true, maxLength: 255 })}
          <Field id="pf-segment" label="Segment" hint={SEGMENTS.find((x) => x.value === segment)?.who}>
            <Select id="pf-segment" name="segment" value={segment} onChange={(e) => setSegment(e.target.value as Segment)}>
              {SEGMENTS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </Select>
          </Field>
          {text("websiteUrl", "Website", p?.websiteUrl, { inputMode: "url", placeholder: "https://" })}
          <Field id="pf-companyDomain" label="Company domain" hint="Filled from the website or email when left empty. Used to stop duplicates.">
            <Input id="pf-companyDomain" name="companyDomain" defaultValue={p?.companyDomain} placeholder="example.com" />
          </Field>
          {text("linkedinUrl", "LinkedIn page", p?.linkedinUrl, { inputMode: "url" })}
          <Field id="pf-teamSize" label="Team size">
            <Select id="pf-teamSize" name="teamSize" defaultValue={p?.teamSize ?? ""}>
              <option value="">Not known</option>
              {TEAM_SIZES.map((t) => <option key={t} value={t}>{t} people</option>)}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-xl">Decision-maker</legend>
        <div className="grid gap-4 md:grid-cols-2">
          {text("contactName", "Name", p?.contactName, { autoComplete: "off" })}
          {text("contactTitle", "Title", p?.contactTitle, { placeholder: "Owner, CTO, hiring manager" })}
          {text("email", "Email", p?.email, { type: "email", autoComplete: "off" })}
          {text("phone", "Phone", p?.phone, { type: "tel", autoComplete: "off" })}
          <Field id="pf-whatsapp" label="WhatsApp" hint="Number with country code, or a wa.me link">
            <Input id="pf-whatsapp" name="whatsapp" defaultValue={p?.whatsapp} autoComplete="off" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-xl">Where</legend>
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="pf-country" label="Country">
            <Select id="pf-country" name="country" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
              {COUNTRY_CODES.map((c) => <option key={c} value={c}>{COUNTRIES[c].name}</option>)}
            </Select>
          </Field>
          <Field id="pf-region" label={COUNTRIES[country].region}>
            <Select id="pf-region" name="region" key={country} defaultValue={p?.country === country ? p.region : ""}>
              <option value="">Not known</option>
              {regionOptions(country).map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </Select>
          </Field>
          {text("city", "City", p?.city)}
        </div>
      </fieldset>

      {withSignal && (
        <fieldset className="space-y-4">
          <legend className="mb-2 text-xl">First buying signal (optional)</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="pf-signalType" label="Kind of signal">
              <Select id="pf-signalType" name="signalType" defaultValue="">
                <option value="">No signal yet</option>
                {SIGNAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>
            <Field id="pf-signalDate" label="Posted on"><Input id="pf-signalDate" name="signalDate" type="date" max={today} /></Field>
            <Field id="pf-signalUrl" label="Link to the post"><Input id="pf-signalUrl" name="signalUrl" inputMode="url" /></Field>
            <Field id="pf-signalSource" label="Where you saw it"><Input id="pf-signalSource" name="signalSource" placeholder="LinkedIn, Upwork, SAM.gov" maxLength={40} /></Field>
          </div>
          <Field id="pf-signalQuote" label="A short quote from it">
            <textarea id="pf-signalQuote" name="signalQuote" rows={2} maxLength={2000} className={area} />
          </Field>
        </fieldset>
      )}

      <Field id="pf-notes" label="Notes">
        <textarea id="pf-notes" name="notes" rows={4} maxLength={5000} defaultValue={p?.notes} className={area} />
      </Field>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
