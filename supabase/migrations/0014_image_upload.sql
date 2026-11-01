-- Image upload: a workshop's real-room photo and a project's build gallery.
-- RLS unchanged: both tables stay owner-scoped; new columns ride along.
alter table public.workshops add column photo_path text;
alter table public.apps add column photos text[] not null default '{}';
