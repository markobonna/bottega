-- Per-project hardware/software kind + generated visual paths.

alter table public.apps
  add column kind text not null default 'software'
    check (kind in ('software', 'hardware'));

alter table public.apps add column look_path text;
alter table public.apps add column blueprint_path text;
