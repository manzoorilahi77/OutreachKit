-- Famysys Outreach Kit: user data only. Static reference data (categories, states, copy) lives in the repo.
-- Every table has row level security; a signed-in user sees only their own rows.

create type public.device as enum ('desktop', 'mobile');

-- The 8 pipeline stages of section 09. Stage 08 is "Won / Lost / Nurture", so it has three values.
create type public.lead_stage as enum (
  'sourced', 'qualified', 'demo_built', 'contacted', 'replied', 'call_booked', 'proposal_sent',
  'won', 'lost', 'nurture'
);

-- Scorer verdict (section 05): Hot 8-10, Warm 5-7, Skip under 5.
create type public.lead_tier as enum ('hot', 'warm', 'skip');

-- ---------------------------------------------------------------- profiles (console step 4)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  studio text not null default '',
  demo_domain text not null default '',
  default_device public.device not null default 'desktop',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- kits (saved console inputs only)
create table public.kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (char_length(category) between 1 and 120),
  device public.device not null,
  state text not null check (state ~ '^[A-Z]{2}$'),
  city text not null check (char_length(city) between 1 and 120),
  city_is_free boolean not null default false,
  created_at timestamptz not null default now()
);
create index kits_owner_idx on public.kits (owner_id, created_at desc);

-- ---------------------------------------------------------------- leads (one row per business)
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kit_id uuid references public.kits (id) on delete set null,

  -- the 28 sheet columns, in sheet order (Score, Tier, Stage and Next action date are below)
  date_sourced date not null default current_date,
  business_name text not null check (char_length(business_name) between 1 and 200),
  owner_first_name text not null default '',
  category text not null default '',
  city text not null default '',
  state text not null default '' check (state = '' or state ~ '^[A-Z]{2}$'),
  phone text not null default '',
  email text not null default '',
  instagram_handle text not null default '',
  facebook_page text not null default '',
  google_maps_url text not null default '',
  website_found boolean,
  website_url text not null default '',
  site_verdict text not null default '',
  google_review_count integer check (google_review_count is null or google_review_count >= 0),
  google_rating numeric(2, 1) check (google_rating is null or google_rating between 0 and 5),
  followers integer check (followers is null or followers >= 0),
  last_post_date date,

  -- the 10 checks of the 30-second scorer
  check_no_real_website boolean not null default false,
  check_owner_run boolean not null default false,
  check_active_30_days boolean not null default false,
  check_older_3_months boolean not null default false,
  check_in_radius boolean not null default false,
  check_job_value_fits boolean not null default false,
  check_reviews_5_to_200 boolean not null default false,
  check_reachable boolean not null default false,
  check_demand_signal boolean not null default false,
  check_second_channel boolean not null default false,

  -- Score /10 and Tier, computed from the checks
  score smallint generated always as (
    check_no_real_website::int + check_owner_run::int + check_active_30_days::int + check_older_3_months::int +
    check_in_radius::int + check_job_value_fits::int + check_reviews_5_to_200::int + check_reachable::int +
    check_demand_signal::int + check_second_channel::int
  ) stored,
  tier public.lead_tier generated always as (
    case
      when (check_no_real_website::int + check_owner_run::int + check_active_30_days::int + check_older_3_months::int +
            check_in_radius::int + check_job_value_fits::int + check_reviews_5_to_200::int + check_reachable::int +
            check_demand_signal::int + check_second_channel::int) >= 8 then 'hot'::public.lead_tier
      when (check_no_real_website::int + check_owner_run::int + check_active_30_days::int + check_older_3_months::int +
            check_in_radius::int + check_job_value_fits::int + check_reviews_5_to_200::int + check_reachable::int +
            check_demand_signal::int + check_second_channel::int) >= 5 then 'warm'::public.lead_tier
      else 'skip'::public.lead_tier
    end
  ) stored,

  demo_url text not null default '',
  demo_built_date date,
  first_contact_date date,
  channel text check (channel is null or channel in ('instagram_dm', 'facebook_dm', 'call', 'email', 'other')),
  replied boolean not null default false,
  stage public.lead_stage not null default 'sourced',
  next_action_date date,
  notes text not null default '',

  -- how many steps of the Day 0/2/5/9/14/45 sequence are done
  sequence_step smallint not null default 0 check (sequence_step between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_owner_stage_idx on public.leads (owner_id, stage);
create index leads_owner_next_idx on public.leads (owner_id, next_action_date);

-- ---------------------------------------------------------------- lead_events (stage changes and contact touches)
create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  kind text not null check (kind in ('stage_change', 'touch')),
  from_stage public.lead_stage,
  to_stage public.lead_stage,
  channel text check (channel is null or channel in ('instagram_dm', 'facebook_dm', 'call', 'email', 'other')),
  occurred_on date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  check ((kind = 'stage_change' and to_stage is not null) or (kind = 'touch'))
);
create index lead_events_owner_idx on public.lead_events (owner_id, lead_id, occurred_on);

-- ---------------------------------------------------------------- triggers
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger leads_updated before update on public.leads for each row execute function public.touch_updated_at();

-- A profile row exists for every account.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Every stage change is logged, so the live ratios can be computed from lead_events.
create or replace function public.log_stage_change() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_events (owner_id, lead_id, kind, from_stage, to_stage) values (new.owner_id, new.id, 'stage_change', null, new.stage);
  elsif new.stage is distinct from old.stage then
    insert into public.lead_events (owner_id, lead_id, kind, from_stage, to_stage) values (new.owner_id, new.id, 'stage_change', old.stage, new.stage);
  end if;
  return null;
end $$;

create trigger leads_log_stage after insert or update of stage on public.leads for each row execute function public.log_stage_change();

-- ---------------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.kits enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy kits_select on public.kits for select to authenticated using (owner_id = (select auth.uid()));
create policy kits_insert on public.kits for insert to authenticated with check (owner_id = (select auth.uid()));
create policy kits_update on public.kits for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy kits_delete on public.kits for delete to authenticated using (owner_id = (select auth.uid()));

-- A lead may only point at a kit the same user owns.
create policy leads_select on public.leads for select to authenticated using (owner_id = (select auth.uid()));
create policy leads_insert on public.leads for insert to authenticated with check (
  owner_id = (select auth.uid())
  and (kit_id is null or exists (select 1 from public.kits k where k.id = kit_id and k.owner_id = (select auth.uid())))
);
create policy leads_update on public.leads for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (kit_id is null or exists (select 1 from public.kits k where k.id = kit_id and k.owner_id = (select auth.uid())))
  );
create policy leads_delete on public.leads for delete to authenticated using (owner_id = (select auth.uid()));

-- An event may only be written against a lead the same user owns.
create policy lead_events_select on public.lead_events for select to authenticated using (owner_id = (select auth.uid()));
create policy lead_events_insert on public.lead_events for insert to authenticated with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.leads l where l.id = lead_id and l.owner_id = (select auth.uid()))
);
create policy lead_events_update on public.lead_events for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy lead_events_delete on public.lead_events for delete to authenticated using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------- grants: signed-in users only, never anon
revoke all on public.profiles, public.kits, public.leads, public.lead_events from anon;
grant select, insert, update, delete on public.profiles, public.kits, public.leads, public.lead_events to authenticated;
