-- Feature cache for Teach: one row per (owner, photo), so any photo
-- always scores the same.

create table public.photo_features (
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz default now(),
  photo_path text not null,
  x float8[] not null,
  source text not null check (source in ('spark', 'color')),
  unique (owner, photo_path)
);

alter table public.photo_features enable row level security;
create policy "photo_features_select_own" on public.photo_features
  for select using (owner = auth.uid());
create policy "photo_features_insert_own" on public.photo_features
  for insert with check (owner = auth.uid());
create policy "photo_features_update_own" on public.photo_features
  for update using (owner = auth.uid());
create policy "photo_features_delete_own" on public.photo_features
  for delete using (owner = auth.uid());
