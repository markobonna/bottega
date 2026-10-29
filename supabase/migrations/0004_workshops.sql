-- Bottega workshops: a user's workshops; every app (project) lives in one.

create table public.workshops (
  id uuid default gen_random_uuid() primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz default now(),
  name text not null,
  updated_at timestamptz default now()
);

alter table public.workshops enable row level security;

create policy "workshops_select_own" on public.workshops
  for select using (owner = auth.uid());
create policy "workshops_insert_own" on public.workshops
  for insert with check (owner = auth.uid());
create policy "workshops_update_own" on public.workshops
  for update using (owner = auth.uid());
create policy "workshops_delete_own" on public.workshops
  for delete using (owner = auth.uid());

alter table public.apps
  add column workshop_id uuid references public.workshops on delete cascade;

-- Backfill: one "My workshop" per owner that already has apps.
do $$
declare
  o uuid;
  w uuid;
begin
  for o in select distinct owner from public.apps loop
    insert into public.workshops (owner, name) values (o, 'My workshop')
      returning id into w;
    update public.apps set workshop_id = w
      where owner = o and workshop_id is null;
  end loop;
end $$;

alter table public.apps alter column workshop_id set not null;
