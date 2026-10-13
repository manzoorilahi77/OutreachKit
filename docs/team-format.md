# The `team/` folder format

> **Legacy format.** The app now runs on MySQL (schema in `db/migrations/`). This format is still what `src/lib/store/fileStore.ts` reads and writes (the reference implementation the contract tests compare MySQL against), and what `pnpm db:import-team` copies into the database. Nobody syncs these files any more; "synced" and "laptop" below describe the old way of working.

Everything the app stores is a file under `team/`, read and written only through the `Store` (`src/lib/store/`).
Format version: **1** (`team/schema.json`). Files from an older version are migrated forward in memory when read; data from a newer version is refused until the code is updated.

## Who writes what

| Path | Holds | Written by |
|---|---|---|
| `team/schema.json` | `{ "version": 1 }` | Super admin |
| `team/workspace.json` | name, studio, demo domain, based line, feature switches, exchange rates (`markets.rates`: CAD and AED per USD, optional) | Admin, super admin |
| `team/teams.json` | teams and their managers | Admin, super admin |
| `team/users/<username>.json` | role, team, status, temporary password hash, `rev`, `pwRev` | Admin, super admin |
| `team/data/<username>/` | everything below | **Only that person's app** |

Nobody writes another person's folder, so syncs don't conflict. Anything that involves two people is derived: a manager's assignment is a line in the **manager's** `assignments.jsonl`; the BD's app shows it as "Assigned to you"; Accept copies the lead into the BD's folder with a `sourceRef`.

## Sample tree

```
team/
├── schema.json
├── workspace.json
├── teams.json
├── users/
│   ├── owner.json   ada.json   mia.json   ravi.json   asha.json   meera.json   ...
└── data/
    ├── owner/
    │   ├── profile.json            own password hash + basedOnRev, default device
    │   ├── approvals.json          content review records (super admin only)
    │   └── audit.jsonl
    ├── mia/                        a manager
    │   ├── assignments.jsonl       hand-offs Mia made
    │   ├── audit.jsonl
    │   └── playbook.json           read receipts and the sections she marked required
    ├── ravi/                       a BD
    │   ├── profile.json
    │   ├── kits/<id>.json          saved kit: inputs + title + status
    │   ├── leads/<id>.json         one lead: the 28 columns, ten checks, stage, sequence
    │   ├── events.jsonl            stage changes, touches, comments (append-only)
    │   ├── audit.jsonl             exports and account actions
    │   ├── playbook.json
    │   └── finder/
    │       ├── businesses.jsonl    lead finder results (and "moved to leads" lines)
    │       └── runs.jsonl
    └── meera/                      a researcher: leads with "assignedTo": null wait in the queue
        ├── leads/<id>.json
        └── events.jsonl
```

All JSON is written with sorted keys, two-space indent, LF line endings and a trailing newline. `.jsonl` files hold one compact object per line and are only ever appended to. `.gitattributes` has `team/** text eol=lf`.

## File shapes

**`team/users/<username>.json`**
```json
{
  "createdAt": "2026-10-12T02:57:16.346Z", "createdBy": "owner",
  "fullName": "Ravi Rao", "role": "bd", "team": "team-a", "username": "ravi",
  "status": "active", "statusReason": "", "suspendedUntil": null,
  "tempPasswordHash": "$2b$12$…",
  "rev": 1, "pwRev": 1, "updatedAt": "2026-10-12T02:57:16.346Z"
}
```
- `rev` goes up with every admin change (reset, suspend, disable, enable, change role, move team). A session signed at an older `rev` ends.
- `pwRev` is the `rev` at which the temporary password was last set (creation or reset). The person's **own** password is the one that works while `profile.basedOnRev === pwRev`; otherwise the temporary one works and a new password must be set. This lets an admin reset a password without writing into the person's folder, and lets a suspension or a role change leave the person's own password alone.
- `status`: `active`, `suspended` (with `statusReason` and an optional `suspendedUntil`, YYYY-MM-DD, lifting the day after), or `disabled`. Accounts are never deleted.

**`team/data/<u>/profile.json`**: `{ "defaultDevice": "desktop", "passwordHash": "$2b$12$…", "basedOnRev": 1 }`

**`team/data/<u>/kits/<id>.json`**: inputs only, rebuilt on view: `id, owner, title, status (draft|active|paused|archived), category, device, state, city, city_is_free, direction, created_at, updated_at`, and for UAE kits an optional `site_lang` (`en`, `ar` or `bi`). `state` is a US state, a Canadian province (`ON`) or an emirate (`DXB`); the country follows from the code.

**`team/data/<u>/leads/<id>.json`**: the old `leads` columns (`business_name … notes`, `stage`, `replied`, `next_action_date`, `sequence_step`, the ten `check_*` booleans) plus `owner`, `assignedTo` (null in the unassigned queue), `sourceRef` (`{ owner, id }` on an accepted copy) and `kit_id`. **Score and tier are not stored**; they are computed from the checks.

**`events.jsonl`** line: `{ id, lead_owner, lead_id, by, kind: stage_change|touch|comment, from_stage, to_stage, channel, occurred_on, note, created_at }`. Stage-change events are written by the Store whenever a lead's stage changes (they replace the old SQL trigger). A comment about someone else's lead lives in the commenter's folder.

**`assignments.jsonl`** line: `{ id, kind: assign|handover, by, leadOwner, leadId, business, to, at }`.

**`audit.jsonl`** line: `{ id, at, actor, action, target, detail }`. Never holds a password or a hash.

**`playbook.json`**: `{ "reads": { "<section id>": "<ISO time>" }, "required": ["<section id>"] }`. A manager's `required` list applies to their team, an admin's to everyone.

**`finder/businesses.jsonl`**: `{ "kind": "business", … }` lines (one saved Maps listing each) and `{ "kind": "moved", "id", "leadId", "at" }` lines. **`finder/runs.jsonl`**: `start` and `finish` lines.

## Duplicates

A business is "already someone's lead" when another lead shares its Maps place key (`m:`), its phone digits (`p:`), or its normalised name + city (`n:`). The index is built from every folder on the laptop, so it is as fresh as the last sync.

## Not in git

`.local/` (session secret, last-sync state, sign-in attempts) is ignored. `pnpm secrets:check` fails if a session secret, a plain-text password field or a `.env` file is tracked.
