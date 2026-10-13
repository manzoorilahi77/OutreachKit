"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { changeUserAction, createUserAction, type AccountState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Select } from "@/components/ui/Field";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import type { Role } from "@/lib/auth/roles";
import { CredentialsPanel } from "./CredentialsPanel";

export interface UserRow {
  username: string; fullName: string; role: Role; roleLabel: string; team: string | null; teamName: string; status: "active" | "suspended" | "disabled";
  statusNote: string; lastSignIn: string | null; createdBy: string;
  /** The signed-in person may act on this account (canManage, and not themselves). */
  manageable: boolean;
  openLeads: number;
}

type Choice = "reset_password" | "suspend" | "disable" | "enable" | "change_role" | "move_team";
const STATUS_LABEL = { active: "Active", suspended: "Paused", disabled: "Turned off" } as const;

const suggest = (fullName: string) => fullName.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").slice(0, 30);

/** The Users screen for /admin/users and /platform/users: one component, scoped by what the signed-in person may manage. */
export function UsersAdmin({ rows, teams, creatableRoles, assignableRoles }: {
  rows: UserRow[];
  teams: { id: string; name: string }[];
  creatableRoles: { value: Role; label: string }[];
  assignableRoles: { value: Role; label: string }[];
}) {
  const [filters, setFilters] = useState({ role: "", team: "", status: "" });
  const shown = useMemo(
    () => rows.filter((r) => (!filters.role || r.role === filters.role) && (!filters.team || (filters.team === "none" ? !r.team : r.team === filters.team)) && (!filters.status || r.status === filters.status)),
    [rows, filters],
  );
  const [creds, setCreds] = useState<NonNullable<NonNullable<AccountState>["credentials"]> | null>(null);
  const [credsAreReset, setCredsAreReset] = useState(false);

  return (
    <div className="space-y-8">
      {creds && <CredentialsPanel credentials={creds} reset={credsAreReset} origin={typeof window === "undefined" ? undefined : window.location.origin} onDone={() => setCreds(null)} />}
      <CreateUser teams={teams} roles={creatableRoles} onCreated={(c) => { setCredsAreReset(false); setCreds(c); }} />

      <section aria-labelledby="people-h" className="space-y-3">
        <h2 id="people-h" className="text-2xl">People</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48"><Field id="f-role" label="Role"><Select id="f-role" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}><option value="">All roles</option>{assignableRoles.concat(creatableRoles.filter((c) => !assignableRoles.some((a) => a.value === c.value))).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select></Field></div>
          <div className="w-48"><Field id="f-team" label="Team"><Select id="f-team" value={filters.team} onChange={(e) => setFilters({ ...filters, team: e.target.value })}><option value="">All teams</option><option value="none">No team</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field></div>
          <div className="w-48"><Field id="f-status" label="Status"><Select id="f-status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All</option><option value="active">Active</option><option value="suspended">Paused</option><option value="disabled">Turned off</option></Select></Field></div>
        </div>
        <TableWrap label="People" minWidth={900}>
          <thead>
            <tr>{["Name", "Username", "Role", "Team", "Status", "Last sign-in here", "Created by", ""].map((h, i) => <th key={i} scope="col" className={th}>{h || <span className="sr-only">Actions</span>}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((r) => <PersonRow key={r.username} r={r} teams={teams} roles={assignableRoles} onCreds={(c) => { setCredsAreReset(true); setCreds(c); }} />)}
          </tbody>
        </TableWrap>
        {!shown.length && <p className="text-muted">No one matches those filters.</p>}
        <p className="text-sm text-muted">A reset, pause, turn-off or role change signs that person out at their next click.</p>
      </section>
    </div>
  );
}

function CreateUser({ teams, roles, onCreated }: { teams: { id: string; name: string }[]; roles: { value: Role; label: string }[]; onCreated: (c: NonNullable<NonNullable<AccountState>["credentials"]>) => void }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(async (prev, fd) => {
    const r = await createUserAction(prev, fd);
    if (r?.ok && r.credentials) { onCreated(r.credentials); (document.getElementById("new-user-form") as HTMLFormElement | null)?.reset(); setUsername(""); setTouched(false); }
    return r?.ok ? { ok: true, message: r.message } : r;
  }, null);
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  return (
    <section aria-labelledby="create-h" className="space-y-3">
      <h2 id="create-h" className="text-2xl">Create a user</h2>
      <form id="new-user-form" action={action} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="nu-name" label="Full name">
            <Input id="nu-name" name="fullName" required autoComplete="off" onChange={(e) => { if (!touched) setUsername(suggest(e.target.value)); }} />
          </Field>
          <Field id="nu-username" label="Username" hint="3 to 30 characters: lower-case letters, digits, dot and underscore. It is also their folder name.">
            <Input id="nu-username" name="username" required value={username} autoComplete="off" autoCapitalize="none" onChange={(e) => { setTouched(true); setUsername(e.target.value.toLowerCase()); }} />
          </Field>
          <Field id="nu-role" label="Role"><Select id="nu-role" name="role" defaultValue="bd">{roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select></Field>
          <Field id="nu-team" label="Team"><Select id="nu-team" name="team" defaultValue=""><option value="">No team</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
          <Field id="nu-password" label="Temporary password (optional)" hint="At least 10 characters. Leave it blank and the app makes one. Either way they must choose their own at first sign-in.">
            <Input id="nu-password" name="password" autoComplete="off" autoCapitalize="none" spellCheck={false} minLength={10} maxLength={72} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create user"}</Button>
          {state && <p className="flex items-center gap-2" role={state.ok ? "status" : "alert"}>{state.ok ? <CheckIcon /> : <AlertIcon />}<span>{state.message}</span></p>}
        </div>
      </form>
    </section>
  );
}

function PersonRow({ r, teams, roles, onCreds }: { r: UserRow; teams: { id: string; name: string }[]; roles: { value: Role; label: string }[]; onCreds: (c: NonNullable<NonNullable<AccountState>["credentials"]>) => void }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [state, action, pending] = useActionState<AccountState, FormData>(async (prev, fd) => {
    const res = await changeUserAction(prev, fd);
    if (res?.ok) { setChoice(null); if (res.credentials) { onCreds(res.credentials); return { ok: true, message: res.message }; } }
    return res;
  }, null);

  const options: [Choice, string][] = [
    ["reset_password", "Reset password"],
    ...(r.status === "active" ? [["suspend", "Pause"] as [Choice, string]] : []),
    ...(r.status !== "disabled" ? [["disable", "Turn off"] as [Choice, string]] : []),
    ...(r.status !== "active" ? [["enable", "Turn on"] as [Choice, string]] : []),
    ["change_role", "Change role"],
    ["move_team", "Move team"],
  ];

  return (
    <>
      <tr>
        <td className={`${td} font-medium text-head`}>{r.fullName}</td>
        <td className={td}>{r.username}</td>
        <td className={td}>{r.roleLabel}</td>
        <td className={td}>{r.teamName}</td>
        <td className={td}><Chip variant={r.status === "active" ? "tier-a" : r.status === "suspended" ? "tier-b" : "skip"}>{STATUS_LABEL[r.status]}</Chip>{r.statusNote && <span className="mt-1 block text-sm text-muted">{r.statusNote}</span>}</td>
        <td className={`${td} tabular-nums`}>{r.lastSignIn ? r.lastSignIn.slice(0, 16).replace("T", " ") : "—"}</td>
        <td className={td}>{r.createdBy}</td>
        <td className={`${td} whitespace-nowrap`}>
          {r.manageable ? (
            <Button variant="secondary" aria-expanded={open} onClick={() => { setOpen((o) => !o); setChoice(null); }}>
              Manage<span className="sr-only"> {r.fullName}</span>
            </Button>
          ) : null}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} className={`${td} bg-surface`}>
            <form action={action} className="space-y-4" aria-label={`Manage ${r.fullName}`}>
              <input type="hidden" name="username" value={r.username} />
              <input type="hidden" name="type" value={choice ?? ""} />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Action">
                {options.map(([c, label]) => (
                  <button
                    key={c} type="button" aria-pressed={choice === c} onClick={() => setChoice(c)}
                    className="inline-flex min-h-11 items-center rounded-md border border-head px-3 text-head hover:bg-head/10 aria-pressed:bg-fill aria-pressed:text-on-fill"
                  >{label}</button>
                ))}
              </div>
              {choice === "reset_password" && (
                <div className="space-y-3">
                  <p>Reset {r.fullName}&apos;s password? They set their own at next sign-in, and any open session ends at their next click.</p>
                  <div className="max-w-md">
                    <Field id={`r-pw-${r.username}`} label="New temporary password (optional)" hint="At least 10 characters. Leave it blank and the app makes one.">
                      <Input id={`r-pw-${r.username}`} name="password" autoComplete="off" autoCapitalize="none" spellCheck={false} minLength={10} maxLength={72} />
                    </Field>
                  </div>
                </div>
              )}
              {choice === "suspend" && (
                <div className="grid max-w-xl gap-4 sm:grid-cols-2">
                  <Field id={`s-reason-${r.username}`} label="Reason"><Input id={`s-reason-${r.username}`} name="reason" required maxLength={300} autoComplete="off" /></Field>
                  <Field id={`s-until-${r.username}`} label="Pause ends (optional)" hint="They can sign in again the day after."><Input id={`s-until-${r.username}`} name="until" type="date" /></Field>
                </div>
              )}
              {choice === "disable" && (r.openLeads > 0
                ? <p role="alert" className="flex items-start gap-2"><AlertIcon className="mt-1 shrink-0" /><span>{r.fullName} has {r.openLeads} open lead{r.openLeads === 1 ? "" : "s"}. <Link href={`/handover?from=${r.username}`}>Hand them over first</Link>; then you can turn the account off.</span></p>
                : <p>Turn off {r.fullName}&apos;s account? They are refused at sign-in straight away. Nothing is deleted.</p>)}
              {choice === "enable" && <p>Let {r.fullName} sign in again?</p>}
              {choice === "change_role" && (
                <div className="max-w-xs"><Field id={`c-role-${r.username}`} label="New role"><Select id={`c-role-${r.username}`} name="role" defaultValue={r.role}>{roles.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</Select></Field></div>
              )}
              {choice === "move_team" && (
                <div className="max-w-xs"><Field id={`m-team-${r.username}`} label="New team"><Select id={`m-team-${r.username}`} name="team" defaultValue={r.team ?? ""}><option value="">No team</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field></div>
              )}
              {choice && !(choice === "disable" && r.openLeads > 0) && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Yes, do it"}</Button>
                  <Button variant="ghost" onClick={() => setChoice(null)}>Cancel</Button>
                </div>
              )}
              {state && <p className="flex items-start gap-2" role={state.ok ? "status" : "alert"}>{state.ok ? <CheckIcon className="mt-1 shrink-0" /> : <AlertIcon className="mt-1 shrink-0" />}<span>{state.message}</span></p>}
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
