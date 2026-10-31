-- Project order within a workshop (room objects lay out in this order).

alter table public.apps add column position integer not null default 0;

with ranked as (
  select id,
    row_number() over (partition by workshop_id order by created_at, id) - 1 as rn
  from public.apps
)
update public.apps a set position = r.rn from ranked r where r.id = a.id;
