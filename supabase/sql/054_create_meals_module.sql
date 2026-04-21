-- =====================================================
-- 054_create_meals_module.sql
-- Módulo de menús/comidas (votación de platos)
-- =====================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.event_meal_options (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_meal_options_event_fk
    foreign key (event_id, host_user_id)
    references public.events(id, host_user_id)
    on delete cascade,
  constraint event_meal_options_label_not_empty
    check (length(trim(label)) > 0)
);

create unique index if not exists uq_event_meal_options_id_event_host
  on public.event_meal_options(id, event_id, host_user_id);

create index if not exists idx_event_meal_options_event_id
  on public.event_meal_options(event_id);

create index if not exists idx_event_meal_options_host_user_id
  on public.event_meal_options(host_user_id);

drop trigger if exists trg_event_meal_options_set_updated_at on public.event_meal_options;
create trigger trg_event_meal_options_set_updated_at
before update on public.event_meal_options
for each row execute function public.set_updated_at();

create table if not exists public.event_meal_selections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  option_id uuid not null,
  guest_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_meal_selections_event_fk
    foreign key (event_id, host_user_id)
    references public.events(id, host_user_id)
    on delete cascade,
  constraint event_meal_selections_option_scope_fk
    foreign key (option_id, event_id, host_user_id)
    references public.event_meal_options(id, event_id, host_user_id)
    on delete cascade,
  constraint event_meal_selections_guest_scope_fk
    foreign key (guest_id, host_user_id)
    references public.guests(id, host_user_id)
    on delete cascade,
  constraint event_meal_selections_guest_unique
    unique (event_id, guest_id)
);

create index if not exists idx_event_meal_selections_event_id
  on public.event_meal_selections(event_id);

create index if not exists idx_event_meal_selections_option_id
  on public.event_meal_selections(option_id);

create index if not exists idx_event_meal_selections_guest_id
  on public.event_meal_selections(guest_id);

drop trigger if exists trg_event_meal_selections_set_updated_at on public.event_meal_selections;
create trigger trg_event_meal_selections_set_updated_at
before update on public.event_meal_selections
for each row execute function public.set_updated_at();

create or replace function public.validate_event_meal_selection_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_invitation_status public.rsvp_status;
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

  return new;
end;
$$;

drop trigger if exists trg_validate_event_meal_selection_scope on public.event_meal_selections;
create trigger trg_validate_event_meal_selection_scope
before insert or update on public.event_meal_selections
for each row execute function public.validate_event_meal_selection_scope();

alter table public.event_meal_options enable row level security;
alter table public.event_meal_selections enable row level security;

drop policy if exists event_meal_options_select_editors on public.event_meal_options;
create policy event_meal_options_select_editors
on public.event_meal_options
for select
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_meal_options_insert_editors on public.event_meal_options;
create policy event_meal_options_insert_editors
on public.event_meal_options
for insert
to authenticated
with check (
  public.is_event_editor(event_id, auth.uid())
  and exists (
    select 1
    from public.events e
    where e.id = event_meal_options.event_id
      and e.host_user_id = event_meal_options.host_user_id
  )
);

drop policy if exists event_meal_options_update_editors on public.event_meal_options;
create policy event_meal_options_update_editors
on public.event_meal_options
for update
to authenticated
using (public.is_event_editor(event_id, auth.uid()))
with check (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_meal_options_delete_editors on public.event_meal_options;
create policy event_meal_options_delete_editors
on public.event_meal_options
for delete
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_meal_selections_select_editors on public.event_meal_selections;
create policy event_meal_selections_select_editors
on public.event_meal_selections
for select
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_meal_selections_insert_editors on public.event_meal_selections;
create policy event_meal_selections_insert_editors
on public.event_meal_selections
for insert
to authenticated
with check (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_meal_selections_update_editors on public.event_meal_selections;
create policy event_meal_selections_update_editors
on public.event_meal_selections
for update
to authenticated
using (public.is_event_editor(event_id, auth.uid()))
with check (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_meal_selections_delete_editors on public.event_meal_selections;
create policy event_meal_selections_delete_editors
on public.event_meal_selections
for delete
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

commit;
