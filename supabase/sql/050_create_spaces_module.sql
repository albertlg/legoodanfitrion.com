-- =====================================================
-- 050_create_spaces_module.sql
-- Módulo de Espacios (acomodación / seating plan)
-- =====================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.event_spaces (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  capacity integer check (capacity is null or capacity > 0),
  type text not null default 'table',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_spaces_event_fk
    foreign key (event_id, host_user_id)
    references public.events(id, host_user_id)
    on delete cascade,
  constraint event_spaces_name_not_empty
    check (length(trim(name)) > 0),
  constraint event_spaces_type_check
    check (type in ('table', 'room', 'vehicle')),
  constraint event_spaces_id_event_host_unique
    unique (id, event_id, host_user_id)
);

create index if not exists idx_event_spaces_event_id
  on public.event_spaces(event_id);

create index if not exists idx_event_spaces_host_user_id
  on public.event_spaces(host_user_id);

drop trigger if exists trg_event_spaces_set_updated_at on public.event_spaces;
create trigger trg_event_spaces_set_updated_at
before update on public.event_spaces
for each row execute function public.set_updated_at();

create table if not exists public.event_space_assignments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.event_spaces(id) on delete cascade,
  guest_id uuid not null,
  event_id uuid not null,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_space_assignments_event_fk
    foreign key (event_id, host_user_id)
    references public.events(id, host_user_id)
    on delete cascade,
  constraint event_space_assignments_guest_fk
    foreign key (guest_id, host_user_id)
    references public.guests(id, host_user_id)
    on delete cascade,
  constraint event_space_assignments_unique_event_guest
    unique (event_id, guest_id),
  constraint event_space_assignments_unique_space_guest
    unique (space_id, guest_id)
);

create index if not exists idx_event_space_assignments_event_id
  on public.event_space_assignments(event_id);

create index if not exists idx_event_space_assignments_space_id
  on public.event_space_assignments(space_id);

create index if not exists idx_event_space_assignments_guest_id
  on public.event_space_assignments(guest_id);

drop trigger if exists trg_event_space_assignments_set_updated_at on public.event_space_assignments;
create trigger trg_event_space_assignments_set_updated_at
before update on public.event_space_assignments
for each row execute function public.set_updated_at();

create or replace function public.validate_event_space_assignment_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_space public.event_spaces%rowtype;
  v_guest public.guests%rowtype;
  v_invitation_exists boolean;
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

  select exists (
    select 1
    from public.invitations i
    where i.event_id = v_space.event_id
      and i.host_user_id = v_space.host_user_id
      and i.guest_id = new.guest_id
  )
  into v_invitation_exists;

  if not v_invitation_exists then
    raise exception 'guest_not_invited_to_event';
  end if;

  new.event_id := v_space.event_id;
  new.host_user_id := v_space.host_user_id;
  return new;
end;
$$;

drop trigger if exists trg_validate_event_space_assignment_scope on public.event_space_assignments;
create trigger trg_validate_event_space_assignment_scope
before insert or update on public.event_space_assignments
for each row execute function public.validate_event_space_assignment_scope();

alter table public.event_spaces enable row level security;
alter table public.event_space_assignments enable row level security;

drop policy if exists event_spaces_select_editors on public.event_spaces;
create policy event_spaces_select_editors
on public.event_spaces
for select
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_spaces_insert_editors on public.event_spaces;
create policy event_spaces_insert_editors
on public.event_spaces
for insert
to authenticated
with check (
  public.is_event_editor(event_id, auth.uid())
  and exists (
    select 1
    from public.events e
    where e.id = event_spaces.event_id
      and e.host_user_id = event_spaces.host_user_id
  )
);

drop policy if exists event_spaces_update_editors on public.event_spaces;
create policy event_spaces_update_editors
on public.event_spaces
for update
to authenticated
using (public.is_event_editor(event_id, auth.uid()))
with check (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_spaces_delete_editors on public.event_spaces;
create policy event_spaces_delete_editors
on public.event_spaces
for delete
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_space_assignments_select_editors on public.event_space_assignments;
create policy event_space_assignments_select_editors
on public.event_space_assignments
for select
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_space_assignments_insert_editors on public.event_space_assignments;
create policy event_space_assignments_insert_editors
on public.event_space_assignments
for insert
to authenticated
with check (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_space_assignments_update_editors on public.event_space_assignments;
create policy event_space_assignments_update_editors
on public.event_space_assignments
for update
to authenticated
using (public.is_event_editor(event_id, auth.uid()))
with check (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_space_assignments_delete_editors on public.event_space_assignments;
create policy event_space_assignments_delete_editors
on public.event_space_assignments
for delete
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

commit;
