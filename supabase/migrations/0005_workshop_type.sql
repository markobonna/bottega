-- Workshop visual identity for the design layer.

alter table public.workshops
  add column type text not null default 'other';

update public.workshops set type = case
  when lower(name) like '%baker%'
    or lower(name) like '%caf%'
    or lower(name) like '%coffee%' then 'cafe'
  when lower(name) like '%garage%'
    or lower(name) like '%wood%'
    or lower(name) like '%bench%'
    or lower(name) like '%restor%' then 'garage'
  when lower(name) like '%dance%'
    or lower(name) like '%studio%'
    or lower(name) like '%yoga%' then 'studio'
  when lower(name) like '%shop%'
    or lower(name) like '%store%'
    or lower(name) like '%market%' then 'store'
  when lower(name) like '%kitchen%'
    or lower(name) like '%restaurant%'
    or lower(name) like '%diner%'
    or lower(name) like '%food%' then 'kitchen'
  when lower(name) like '%music%'
    or lower(name) like '%band%' then 'music'
  when lower(name) like '%class%'
    or lower(name) like '%school%'
    or lower(name) like '%teach%' then 'classroom'
  else 'other'
end;
