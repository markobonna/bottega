-- Concierge sourcing requests: the user asked Bottega to find a supplier
-- because none in the directory fits. A human replies within 48 hours.

create table public.concierge_requests (
  id uuid default gen_random_uuid() primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  app_id uuid references public.apps on delete cascade,
  email text not null,
  note text not null default '',
  status text not null default 'new',
  created_at timestamptz default now()
);

alter table public.concierge_requests enable row level security;

create policy "own concierge select" on public.concierge_requests
  for select using (owner = auth.uid());
create policy "own concierge insert" on public.concierge_requests
  for insert with check (owner = auth.uid());
create policy "own concierge update" on public.concierge_requests
  for update using (owner = auth.uid());
create policy "own concierge delete" on public.concierge_requests
  for delete using (owner = auth.uid());

create index concierge_owner_idx
  on public.concierge_requests (owner, created_at);
