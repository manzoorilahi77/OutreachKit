// The IT Prospects CSV import: a sheet of companies and their signals, for example an export of the us-it-lead-drafts
// tracker. Headers are matched loosely ("Company", "Company name", "Job URL", "Date posted"...). Pure: the server re-runs
// it before anything is saved, and the Store decides what is a duplicate.
import { parseCsv } from "@/lib/leads/import";
import { parseProspect, parseSignalInput } from "./form";
import { domainOf } from "./keys";
import { isSegment, isSignalType, SEGMENTS, SIGNAL_TYPES, signalInfo, type ItProspectInput, type ItSignalInput, type Segment, type SignalType } from "./model";
import { guessDate, guessType, sourceOf } from "./parseSignal";

export const IT_IMPORT_CAP = 200;

type Field =
  | "company" | "companyDomain" | "websiteUrl" | "linkedinUrl" | "contactName" | "firstName" | "lastName" | "contactTitle" | "email" | "phone" | "whatsapp"
  | "city" | "region" | "country" | "segment" | "teamSize" | "notes" | "signalType" | "signalUrl" | "signalDate" | "signalQuote" | "signalSource" | "role";

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, "");

const SYNONYMS: Record<Field, string[]> = {
  company: ["company", "companyname", "business", "businessname", "organization", "organisation", "account", "agency", "employer", "client"],
  companyDomain: ["domain", "companydomain", "websitedomain"],
  websiteUrl: ["website", "websiteurl", "site", "companywebsite", "homepage", "web"],
  linkedinUrl: ["linkedin", "linkedinurl", "companylinkedin", "contactlinkedin", "linkedinprofile"],
  contactName: ["contact", "contactname", "name", "fullname", "decisionmaker", "hiringmanager", "person"],
  firstName: ["firstname", "first"],
  lastName: ["lastname", "last", "surname"],
  contactTitle: ["title", "contacttitle", "designation", "contactrole"],
  email: ["email", "emailaddress", "contactemail", "workemail"],
  phone: ["phone", "phonenumber", "telephone", "mobile"],
  whatsapp: ["whatsapp"],
  city: ["city", "town"],
  region: ["state", "province", "emirate", "region", "statecode"],
  country: ["country", "countrycode"],
  segment: ["segment"],
  teamSize: ["teamsize", "companysize", "employees", "size"],
  notes: ["notes", "comments", "comment", "remarks"],
  signalType: ["signaltype", "signal", "trigger", "leadtype", "triggertype"],
  signalUrl: ["signalurl", "joburl", "posturl", "link", "url", "sourceurl", "joblink", "postlink", "tenderurl"],
  signalDate: ["signaldate", "posted", "posteddate", "dateposted", "date", "postdate", "publisheddate"],
  signalQuote: ["quote", "signalquote", "summary", "description", "snippet", "excerpt"],
  signalSource: ["source", "platform", "board", "jobboard"],
  role: ["role", "jobtitle", "position", "opening", "openrole", "project"],
};

const LOOKUP = new Map<string, Field>(Object.entries(SYNONYMS).flatMap(([f, names]) => names.map((n) => [n, f as Field] as const)));

export const IT_CSV_HEADER_HINT = "Company, Website, Contact name, Title, Email, Phone, City, State, Country, Segment, Signal type, Signal URL, Signal date, Quote, Source, Notes";

function readType(v: string): SignalType | null {
  const s = v.trim();
  if (!s) return null;
  if (isSignalType(s)) return s;
  const byLabel = SIGNAL_TYPES.find((t) => t.label.toLowerCase() === s.toLowerCase());
  if (byLabel) return byLabel.value;
  if (/job|hiring|role|vacanc|opening/i.test(s)) return /it|support|admin|data entry|ops|operation/i.test(s) && !/develop|engineer/i.test(s) ? "it_role" : "dev_role";
  return guessType(s);
}

function readSegment(v: string): Segment | null {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (isSegment(s)) return s;
  const hit = SEGMENTS.find((x) => x.label.toLowerCase() === s || x.short.toLowerCase() === s);
  if (hit) return hit.value;
  if (/agenc|white|partner|it firm|studio/.test(s)) return "agency";
  if (/need|ops|spreadsheet/.test(s)) return "it_need";
  if (/buy|signal|job|tender|project/.test(s)) return "buyer";
  return null;
}

/** "Texas" or "tx" → "TX"; anything else is kept for the form check to refuse. */
function readRegion(v: string): string {
  return v.trim().toUpperCase();
}

export interface ItImportRow {
  line: number;
  company: string;
  input?: ItProspectInput;
  signal?: ItSignalInput | null;
  error?: string;
}

export type ItCsvParse = { ok: true; rows: ItImportRow[]; unknownHeaders: string[] } | { ok: false; error: string };

export function parseItCsv(text: string, today: string): ItCsvParse {
  const table = parseCsv(text);
  if (!table.length) return { ok: false, error: "The file is empty." };
  const header = table[0]!;
  const fields = header.map((h) => LOOKUP.get(norm(h)) ?? null);
  if (!fields.includes("company")) return { ok: false, error: "The first row needs a Company column (or Business, Organization, Agency)." };
  const body = table.slice(1);
  if (!body.length) return { ok: false, error: "The file has a header but no rows." };
  if (body.length > IT_IMPORT_CAP) return { ok: false, error: `Import at most ${IT_IMPORT_CAP} rows at a time; this file has ${body.length}.` };
  const unknownHeaders = header.filter((h, i) => !fields[i] && h.trim());

  const rows = body.map((cells, i): ItImportRow => {
    const line = i + 2;
    const v: Partial<Record<Field, string>> = {};
    fields.forEach((f, j) => { if (f && !v[f]) v[f] = (cells[j] ?? "").trim(); });
    const company = v.company ?? "";
    const contactName = v.contactName || [v.firstName, v.lastName].filter(Boolean).join(" ");

    const typeText = v.signalType || v.role || "";
    const hasSignal = !!(v.signalUrl || v.signalQuote || v.signalType || v.role);
    const type = hasSignal ? (readType(typeText) ?? guessType(`${v.signalQuote ?? ""} ${v.role ?? ""}`, v.signalUrl ?? "")) : null;
    const rawDate = v.signalDate ?? "";
    const date = !rawDate ? "" : /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : (guessDate(rawDate, today) ?? "");
    if (rawDate && !date) return { line, company, error: `The signal date “${rawDate}” isn't a date this import can read. Use YYYY-MM-DD.` };

    const segmentRaw = v.segment ?? "";
    const segment = readSegment(segmentRaw) ?? (type ? signalInfo(type).segment : "agency");
    if (segmentRaw && !readSegment(segmentRaw)) return { line, company, error: `Unknown segment “${segmentRaw}”. Use Buying signal, Agency / IT firm or IT need.` };

    const country = (v.country ?? "").trim();
    const countryCode = /^(united states|usa|us|u\.s\.)$/i.test(country) ? "US" : /^(canada|ca)$/i.test(country) ? "CA" : /^(uae|ae|united arab emirates)$/i.test(country) ? "AE" : country;
    const form: Record<string, string> = {
      company, segment, companyDomain: v.companyDomain ? domainOf(v.companyDomain) || v.companyDomain : "", websiteUrl: v.websiteUrl ?? "", linkedinUrl: v.linkedinUrl ?? "",
      contactName, contactTitle: v.contactTitle ?? "", email: v.email ?? "", phone: v.phone ?? "", whatsapp: v.whatsapp ?? "", city: v.city ?? "",
      region: readRegion(v.region ?? ""), country: countryCode, teamSize: "", notes: [v.notes, v.teamSize ? `Team size: ${v.teamSize}` : ""].filter(Boolean).join("\n"),
    };
    const p = parseProspect((k) => form[k] ?? "");
    if (!p.ok) return { line, company, error: p.error };
    if (!type) return { line, company, input: p.value, signal: null };

    const quote = [v.role ? `Role: ${v.role}` : "", v.signalQuote ?? ""].filter(Boolean).join(" — ");
    const sig: Record<string, string> = {
      signalType: type, signalUrl: v.signalUrl ?? "", signalQuote: quote, signalDate: date, signalSource: v.signalSource || sourceOf(v.signalUrl ?? "") || "CSV import",
    };
    const s = parseSignalInput((k) => sig[k] ?? "");
    if (!s.ok) return { line, company, error: s.error };
    return { line, company, input: p.value, signal: s.value };
  });
  return { ok: true, rows, unknownHeaders };
}
