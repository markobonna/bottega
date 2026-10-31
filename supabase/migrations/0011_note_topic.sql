-- Topic tags on margin notes: the toolbar tool that focused each note
-- (e.g. 'measure', 'screens'). Untagged notes stay general.

alter table public.project_notes add column topic text;

create index project_notes_topic_idx
  on public.project_notes (app_id, topic);
