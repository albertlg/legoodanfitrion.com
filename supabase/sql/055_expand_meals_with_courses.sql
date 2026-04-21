-- =====================================================
-- 055_expand_meals_with_courses.sql
-- Evolución meals v2: categorías (courses) + selección por categoría
-- =====================================================

begin;

alter table public.event_meal_options
  add column if not exists course_key text,
  add column if not exists course_label text;

update public.event_meal_options
set course_key = 'general'
where course_key is null
  or length(trim(course_key)) = 0;

alter table public.event_meal_options
  alter column course_key set default 'general',
  alter column course_key set not null;

create index if not exists idx_event_meal_options_course_key
  on public.event_meal_options(event_id, course_key);

alter table public.event_meal_selections
  add column if not exists course_key text;

update public.event_meal_selections s
set course_key = coalesce(nullif(trim(o.course_key), ''), 'general')
from public.event_meal_options o
where s.option_id = o.id
  and (s.course_key is null or length(trim(s.course_key)) = 0);

update public.event_meal_selections
set course_key = 'general'
where course_key is null
  or length(trim(course_key)) = 0;

alter table public.event_meal_selections
  alter column course_key set default 'general',
  alter column course_key set not null;

alter table public.event_meal_selections
  drop constraint if exists event_meal_selections_guest_unique;

alter table public.event_meal_selections
  add constraint event_meal_selections_guest_course_unique
  unique (event_id, guest_id, course_key);

create index if not exists idx_event_meal_selections_guest_course
  on public.event_meal_selections(event_id, guest_id, course_key);

create or replace function public.validate_event_meal_selection_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_invitation_status public.rsvp_status;
  v_option_course_key text;
begin
  select i.status
  into v_invitation_status
  from public.invitations i
  where i.event_id = new.event_id
    and i.host_user_id = new.host_user_id
    and i.guest_id = new.guest_id
  limit 1;

  if v_invitation_status is null then
    raise exception 'meal_selection_guest_not_invited';
  end if;

  if v_invitation_status <> 'yes'::public.rsvp_status then
    raise exception 'meal_selection_guest_not_confirmed';
  end if;

  select coalesce(nullif(trim(o.course_key), ''), 'general')
  into v_option_course_key
  from public.event_meal_options o
  where o.id = new.option_id
    and o.event_id = new.event_id
    and o.host_user_id = new.host_user_id
  limit 1;

  if v_option_course_key is null then
    raise exception 'meal_selection_option_scope_mismatch';
  end if;

  if new.course_key is null or length(trim(new.course_key)) = 0 then
    new.course_key := v_option_course_key;
  end if;

  if new.course_key <> v_option_course_key then
    raise exception 'meal_selection_course_mismatch';
  end if;

  return new;
end;
$$;

commit;
