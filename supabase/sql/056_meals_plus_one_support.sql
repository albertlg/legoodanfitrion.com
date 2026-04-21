-- =====================================================
-- 056_meals_plus_one_support.sql
-- Soporte de selecciones de menú para acompañantes (+1)
-- =====================================================

begin;

alter table public.event_meal_selections
  add column if not exists is_plus_one boolean not null default false;

update public.event_meal_selections
set is_plus_one = false
where is_plus_one is null;

alter table public.event_meal_selections
  drop constraint if exists event_meal_selections_guest_course_unique;

alter table public.event_meal_selections
  add constraint event_meal_selections_guest_course_plus_one_unique
  unique (event_id, guest_id, course_key, is_plus_one);

create index if not exists idx_event_meal_selections_guest_course_plus_one
  on public.event_meal_selections(event_id, guest_id, course_key, is_plus_one);

create or replace function public.validate_event_meal_selection_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_invitation_status public.rsvp_status;
  v_invitation_plus_one boolean;
  v_option_course_key text;
begin
  select i.status, coalesce(i.rsvp_plus_one, false)
  into v_invitation_status, v_invitation_plus_one
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

  if coalesce(new.is_plus_one, false) and not v_invitation_plus_one then
    raise exception 'meal_selection_plus_one_not_confirmed';
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
