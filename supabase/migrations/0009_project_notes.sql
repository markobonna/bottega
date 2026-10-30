-- Margin notes pinned to project drawings (design: views/project.js).

create table public.project_notes (
  id uuid default gen_random_uuid() primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  app_id uuid references public.apps on delete cascade,
  who text not null check (who in ('you', 'apprentice')),
  part smallint,
  text text not null,
  created_at timestamptz default now()
);

alter table public.project_notes enable row level security;

create policy "own notes select" on public.project_notes
  for select using (owner = auth.uid());
create policy "own notes insert" on public.project_notes
  for insert with check (owner = auth.uid());
create policy "own notes update" on public.project_notes
  for update using (owner = auth.uid());
create policy "own notes delete" on public.project_notes
  for delete using (owner = auth.uid());

create index project_notes_app_idx
  on public.project_notes (app_id, created_at);
