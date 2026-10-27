-- Bottega initial schema: apps, versions, records, models, examples, events.
-- Every table carries owner = auth.uid() with full RLS isolation.

create extension if not exists "pgcrypto";

-- Apps ----------------------------------------------------------------

create table public.apps (
  id uuid default gen_random_uuid() primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz default now(),
  name text not null,
  spec jsonb not null,
  version int not null default 1,
  private bool not null default false,
  updated_at timestamptz default now()
);

-- App versions ---------------------------------------------------------

create table public.app_versions (
  id uuid default gen_random_uuid() primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz default now(),
  app_id uuid references public.apps on delete cascade,
  version int,
  spec jsonb,
  ops jsonb,
  summary text,
  source text check (source in ('build', 'edit', 'suggest', 'inline')),
  unique (app_id, version)
);

-- Records --------------------------------------------------------------

create table public.records (
  id uuid default gen_random_uuid() primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz default now(),
  app_id uuid references public.apps on delete cascade,
  collection text,
  data jsonb not null default '{}'
);

create index records_app_collection_created_idx
  on public.records (app_id, collection, created_at desc);

-- Teach models ----------------------------------------------------------

create table public.models (
  id uuid default gen_random_uuid() primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz default now(),
  app_id uuid references public.apps on delete cascade,
  block_id text,
  labels text[],
  dims jsonb,
  w float8[],
  b float8,
  rounds int,
  curve float8[],
  feature_source text check (feature_source in ('spark', 'color')),
  unique (app_id, block_id)
);

-- Teach examples ---------------------------------------------------------

create table public.examples (
  id uuid default gen_random_uuid() primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz default now(),
  model_id uuid references public.models on delete cascade,
  photo_path text,
  x float8[],
  y smallint check (y in (0, 1))
);

-- Events -----------------------------------------------------------------

create table public.events (
  id uuid default gen_random_uuid() primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz default now(),
  app_id uuid references public.apps on delete cascade,
  kind text,
  detail jsonb
);

-- Row Level Security: owners see only their own rows ----------------------

alter table public.apps enable row level security;
create policy "apps_select_own" on public.apps
  for select using (owner = auth.uid());
create policy "apps_insert_own" on public.apps
  for insert with check (owner = auth.uid());
create policy "apps_update_own" on public.apps
  for update using (owner = auth.uid());
create policy "apps_delete_own" on public.apps
  for delete using (owner = auth.uid());

alter table public.app_versions enable row level security;
create policy "app_versions_select_own" on public.app_versions
  for select using (owner = auth.uid());
create policy "app_versions_insert_own" on public.app_versions
  for insert with check (owner = auth.uid());
create policy "app_versions_update_own" on public.app_versions
  for update using (owner = auth.uid());
create policy "app_versions_delete_own" on public.app_versions
  for delete using (owner = auth.uid());

alter table public.records enable row level security;
create policy "records_select_own" on public.records
  for select using (owner = auth.uid());
create policy "records_insert_own" on public.records
  for insert with check (owner = auth.uid());
create policy "records_update_own" on public.records
  for update using (owner = auth.uid());
create policy "records_delete_own" on public.records
  for delete using (owner = auth.uid());

alter table public.models enable row level security;
create policy "models_select_own" on public.models
  for select using (owner = auth.uid());
create policy "models_insert_own" on public.models
  for insert with check (owner = auth.uid());
create policy "models_update_own" on public.models
  for update using (owner = auth.uid());
create policy "models_delete_own" on public.models
  for delete using (owner = auth.uid());

alter table public.examples enable row level security;
create policy "examples_select_own" on public.examples
  for select using (owner = auth.uid());
create policy "examples_insert_own" on public.examples
  for insert with check (owner = auth.uid());
create policy "examples_update_own" on public.examples
  for update using (owner = auth.uid());
create policy "examples_delete_own" on public.examples
  for delete using (owner = auth.uid());

alter table public.events enable row level security;
create policy "events_select_own" on public.events
  for select using (owner = auth.uid());
create policy "events_insert_own" on public.events
  for insert with check (owner = auth.uid());
create policy "events_update_own" on public.events
  for update using (owner = auth.uid());
create policy "events_delete_own" on public.events
  for delete using (owner = auth.uid());

-- Private media bucket, isolated per user by path prefix -------------------

insert into storage.buckets (id, name, public)
  values ('media', 'media', false);

create policy "media_select_own" on storage.objects
  for select using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "media_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "media_update_own" on storage.objects
  for update using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "media_delete_own" on storage.objects
  for delete using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
