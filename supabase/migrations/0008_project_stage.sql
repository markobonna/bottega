-- Project lifecycle stage, set by advancing / sending off / arriving.
-- Null means "derive from the version number" (v1 sketch … v4+ arrived).

alter table public.apps add column stage text
  check (stage in ('sketch', 'shape', 'build', 'sent', 'arrived'));
alter table public.apps add column arrive_at timestamptz;
alter table public.apps add column arrival_seen boolean not null default false;
alter table public.apps add column order_info jsonb;
