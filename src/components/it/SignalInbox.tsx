"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveSignalAction, type InboxResult } from "@/app/it/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { SEGMENTS, SIGNAL_TYPES, signalInfo, type Segment, type SignalType } from "@/lib/it/model";
import { parseSignal, type ParsedSignal } from "@/lib/it/parseSignal";
import { COUNTRIES, COUNTRY_CODES, regionOptions, type Country } from "@/lib/market/regions";
import { FormMessage } from "./FormMessage";

const area = "w-full rounded-md border border-fg/60 bg-bg px-3 py-2 text-base text-fg";

/**
 * Paste a job post, project post or tender; the app reads it (plain rules, in this browser) and fills a form for a person to
 * check. Saving makes a new prospect, or adds the signal to the matching prospect you already work.
 */
export function SignalInbox({ today }: { today: string }) {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [parsed, setParsed] = useState<ParsedSignal | null>(null);
  const [round, setRound] = useState(0);
  const [result, run, pending] = useActionState<InboxResult, FormData>(async (prev, fd) => {
    const r = await saveSignalAction(prev, fd);
    if (r?.ok) { setParsed(null); setText(""); setUrl(""); }
    return r;
  }, null);

  function read() {
    setParsed(parseSignal(text, url, today));
    setRound((n) => n + 1);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Field id="in-url" label="Link to the post" hint="LinkedIn, Indeed, Upwork, a tender portal, a Reddit thread or the company's own careers page.">
          <Input id="in-url" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
        </Field>
        <Field id="in-text" label="The post's text" hint="Select the post on the page, copy it and paste it here. Nothing leaves this browser until you save.">
          <textarea id="in-text" value={text} onChange={(e) => setText(e.target.value)} rows={8} className={area} />
        </Field>
        <Button onClick={read} disabled={!text.trim() && !url.trim()}>Read it</Button>
      </div>

      {result && <div>{result.ok
        ? <Note><p role="status">{result.message} <Link href={`/it/prospects/${result.prospectId}`}>Open the prospect</Link></p></Note>
        : <FormMessage state={result} />}</div>}

      {parsed && <Review key={round} parsed={parsed} url={url} today={today} run={run} pending={pending} />}
    </div>
  );
}

function Review({ parsed, url, today, run, pending }: { parsed: ParsedSignal; url: string; today: string; run: (fd: FormData) => void; pending: boolean }) {
  const [type, setType] = useState<SignalType>(parsed.type);
  const [segment, setSegment] = useState<Segment>(signalInfo(parsed.type).segment);
  const [country, setCountry] = useState<Country>(parsed.country ?? "US");
  const missing = [!parsed.company && "the company", !parsed.signalDate && "the date"].filter(Boolean);
  return (
    <form action={run} className="space-y-6 rounded-lg border border-head p-4 sm:p-6">
      <div className="space-y-1">
        <h2 className="text-2xl">Check before saving</h2>
        <p className="text-muted">{missing.length ? `Couldn't find ${missing.join(" or ")}: fill ${missing.length > 1 ? "them" : "it"} in from the post.` : "Everything below was read from the post. Correct anything that's wrong."}</p>
      </div>
      <fieldset className="space-y-4">
        <legend className="mb-2 text-xl">The signal</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="rv-type" label="Kind of signal" hint={signalInfo(type).what}>
            <Select id="rv-type" name="signalType" value={type} onChange={(e) => { const t = e.target.value as SignalType; setType(t); setSegment(signalInfo(t).segment); }}>
              {SIGNAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <Field id="rv-date" label="Posted on"><Input id="rv-date" name="signalDate" type="date" max={today} defaultValue={parsed.signalDate ?? ""} /></Field>
          <Field id="rv-url" label="Link"><Input id="rv-url" name="signalUrl" defaultValue={url} inputMode="url" /></Field>
          <Field id="rv-source" label="Where you saw it"><Input id="rv-source" name="signalSource" defaultValue={parsed.source} maxLength={40} /></Field>
        </div>
        <Field id="rv-quote" label="Quote"><textarea id="rv-quote" name="signalQuote" rows={3} maxLength={2000} defaultValue={[parsed.headline, parsed.quote].filter((x, i, a) => x && a.indexOf(x) === i).join(" — ")} className={area} /></Field>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="mb-2 text-xl">The company</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="rv-company" label="Company name"><Input id="rv-company" name="company" defaultValue={parsed.company} required maxLength={255} /></Field>
          <Field id="rv-segment" label="Segment">
            <Select id="rv-segment" name="segment" value={segment} onChange={(e) => setSegment(e.target.value as Segment)}>{SEGMENTS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</Select>
          </Field>
          <Field id="rv-domain" label="Company domain" hint="Stops duplicates. Leave empty if the post doesn't name the company's site.">
            <Input id="rv-domain" name="companyDomain" defaultValue={parsed.companyDomain} placeholder="example.com" />
          </Field>
          <Field id="rv-email" label="Email"><Input id="rv-email" name="email" type="email" defaultValue={parsed.email} /></Field>
          <Field id="rv-contact" label="Contact name"><Input id="rv-contact" name="contactName" /></Field>
          <Field id="rv-title" label="Contact title"><Input id="rv-title" name="contactTitle" placeholder="Hiring manager, CTO, owner" /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="rv-country" label="Country">
            <Select id="rv-country" name="country" value={country} onChange={(e) => setCountry(e.target.value as Country)}>{COUNTRY_CODES.map((c) => <option key={c} value={c}>{COUNTRIES[c].name}</option>)}</Select>
          </Field>
          <Field id="rv-region" label={COUNTRIES[country].region}>
            <Select id="rv-region" name="region" key={country} defaultValue={parsed.country === country ? parsed.region : ""}>
              <option value="">Not known</option>
              {regionOptions(country).map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </Select>
          </Field>
          <Field id="rv-city" label="City"><Input id="rv-city" name="city" defaultValue={parsed.city} /></Field>
        </div>
        <Field id="rv-notes" label="Notes"><textarea id="rv-notes" name="notes" rows={2} maxLength={5000} defaultValue={parsed.remote ? "Remote role." : ""} className={area} /></Field>
      </fieldset>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save the signal"}</Button>
    </form>
  );
}
