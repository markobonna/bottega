-- Demo templates are readable by everyone: judges and guests run Try-as
-- against these accounts with only the public anon key. Real users' rows
-- stay private (proven by scripts/check-isolation.ts). Only the service
-- role (seed script) can register or remove templates.

create table public.demo_templates (
  owner uuid primary key references auth.users on delete cascade,
  label text not null,
  created_at timestamptz default now()
);

alter table public.demo_templates enable row level security;

create policy "demo_templates_read" on public.demo_templates
  for select using (true);

-- Every table Try-as copies from: own rows plus template rows.
create policy "template_read" on public.workshops
  for select using (owner in (select owner from public.demo_templates));

create policy "template_read" on public.apps
  for select using (owner in (select owner from public.demo_templates));

create policy "template_read" on public.app_versions
  for select using (owner in (select owner from public.demo_templates));

create policy "template_read" on public.records
  for select using (owner in (select owner from public.demo_templates));

create policy "template_read" on public.models
  for select using (owner in (select owner from public.demo_templates));

create policy "template_read" on public.examples
  for select using (owner in (select owner from public.demo_templates));

create policy "template_read" on public.photo_features
  for select using (owner in (select owner from public.demo_templates));

-- Template photos are world-readable; writes stay owner-only.
create policy "template_media_read" on storage.objects
  for select using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] in (select owner::text from public.demo_templates)
  );
