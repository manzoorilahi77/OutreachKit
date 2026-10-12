-- Field Kit v2: the design direction a saved kit was built with. Saving still stores inputs only;
-- /kits/[id] rebuilds the kit from them. The existing kits RLS policies cover the new column.
alter table public.kits
  add column direction text not null default 'b' check (direction in ('a', 'b', 'c'));
