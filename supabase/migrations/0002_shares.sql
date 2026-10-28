-- Compare share links: one token per shared record, revocable.

create table public.shares (
  id uuid default gen_random_uuid() primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz default now(),
  app_id uuid references public.apps on delete cascade,
  record_id uuid references public.records on delete cascade,
  token text unique not null,
  revoked bool not null default false
);

alter table public.shares enable row level security;
create policy "shares_select_own" on public.shares
  for select using (owner = auth.uid());
create policy "shares_insert_own" on public.shares
  for insert with check (owner = auth.uid());
create policy "shares_update_own" on public.shares
  for update using (owner = auth.uid());
create policy "shares_delete_own" on public.shares
  for delete using (owner = auth.uid());
