-- =====================================================
-- 057_spaces_plus_one_support.sql
-- Soporte +1 en asignaciones del módulo de espacios
-- =====================================================

begin;

alter table public.event_space_assignments
  add column if not exists is_plus_one boolean not null default false;

update public.event_space_assignments
set is_plus_one = false
where is_plus_one is null;

alter table public.event_space_assignments
  drop constraint if exists event_space_assignments_unique_event_guest;

alter table public.event_space_assignments
  drop constraint if exists event_space_assignments_unique_space_guest;

alter table public.event_space_assignments
  drop constraint if exists event_space_assignments_unique_event_guest_scope;

alter table public.event_space_assignments
  drop constraint if exists event_space_assignments_unique_space_guest_scope;

alter table public.event_space_assignments
  add constraint event_space_assignments_unique_event_guest_scope
    unique (event_id, guest_id, is_plus_one);

alter table public.event_space_assignments
  add constraint event_space_assignments_unique_space_guest_scope
    unique (space_id, guest_id, is_plus_one);

create index if not exists idx_event_space_assignments_event_guest_scope
  on public.event_space_assignments(event_id, guest_id, is_plus_one);

create or replace function public.validate_event_space_assignment_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_space public.event_spaces%rowtype;
  v_guest public.guests%rowtype;
  v_invitation_plus_one boolean;
begin
  select *
  into v_space
  from public.event_spaces s
  where s.id = new.space_id
  limit 1;

  if v_space.id is null then
    raise exception 'event_space_not_found';
  end if;

  select *
  into v_guest
  from public.guests g
  where g.id = new.guest_id
  limit 1;

  if v_guest.id is null then
    raise exception 'guest_not_found';
  end if;

  if v_guest.host_user_id <> v_space.host_user_id then
    raise exception 'guest_host_mismatch_for_space';
  end if;

  select i.rsvp_plus_one
  into v_invitation_plus_one
  from public.invitations i
  where i.event_id = v_space.event_id
    and i.host_user_id = v_space.host_user_id
    and i.guest_id = new.guest_id
  limit 1;

  if v_invitation_plus_one is null and not exists (
    select 1
    from public.invitations i2
    where i2.event_id = v_space.event_id
      and i2.host_user_id = v_space.host_user_id
      and i2.guest_id = new.guest_id
  ) then
    raise exception 'guest_not_invited_to_event';
  end if;

  new.is_plus_one := coalesce(new.is_plus_one, false);
  if new.is_plus_one and not coalesce(v_invitation_plus_one, false) then
    raise exception 'guest_plus_one_not_confirmed';
  end if;

  new.event_id := v_space.event_id;
  new.host_user_id := v_space.host_user_id;
  return new;
end;
$$;

commit;
