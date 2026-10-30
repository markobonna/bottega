-- Project kind grows from software/hardware to the design's seven mediums.

alter table public.apps drop constraint if exists apps_kind_check;
alter table public.apps add constraint apps_kind_check
  check (kind in ('hardware', 'software', 'music', 'dance', 'print', 'recipe', 'space'));
