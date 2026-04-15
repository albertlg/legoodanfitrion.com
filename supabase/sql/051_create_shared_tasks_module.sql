-- =====================================================
-- 051_create_shared_tasks_module.sql
-- Módulo de tareas compartidas (logística colaborativa)
-- =====================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.event_shared_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  assigned_to_guest_id uuid,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_shared_tasks_event_fk
    foreign key (event_id, host_user_id)
    references public.events(id, host_user_id)
    on delete cascade,
  constraint event_shared_tasks_assigned_guest_fk
    foreign key (assigned_to_guest_id, host_user_id)
    references public.guests(id, host_user_id)
    on delete set null,
  constraint event_shared_tasks_title_not_empty
    check (length(trim(title)) > 0)
);

create index if not exists idx_event_shared_tasks_event_id
  on public.event_shared_tasks(event_id);

create index if not exists idx_event_shared_tasks_host_user_id
  on public.event_shared_tasks(host_user_id);

create index if not exists idx_event_shared_tasks_assigned_guest_id
  on public.event_shared_tasks(assigned_to_guest_id)
  where assigned_to_guest_id is not null;

create index if not exists idx_event_shared_tasks_is_completed
  on public.event_shared_tasks(event_id, is_completed, created_at);

drop trigger if exists trg_event_shared_tasks_set_updated_at on public.event_shared_tasks;
create trigger trg_event_shared_tasks_set_updated_at
before update on public.event_shared_tasks
for each row execute function public.set_updated_at();

create or replace function public.validate_event_shared_task_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_invitation_exists boolean;
begin
  select *
  into v_event
  from public.events e
  where e.id = new.event_id
  limit 1;

  if v_event.id is null then
    raise exception 'event_not_found';
  end if;

  if v_event.host_user_id <> new.host_user_id then
    raise exception 'event_host_mismatch_for_shared_task';
  end if;

  if new.assigned_to_guest_id is not null then
    select exists (
      select 1
      from public.invitations i
      where i.event_id = new.event_id
        and i.host_user_id = new.host_user_id
        and i.guest_id = new.assigned_to_guest_id
    )
    into v_invitation_exists;

    if not v_invitation_exists then
      raise exception 'assigned_guest_not_invited_to_event';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_event_shared_task_scope on public.event_shared_tasks;
create trigger trg_validate_event_shared_task_scope
before insert or update on public.event_shared_tasks
for each row execute function public.validate_event_shared_task_scope();

alter table public.event_shared_tasks enable row level security;

drop policy if exists event_shared_tasks_select_editors on public.event_shared_tasks;
create policy event_shared_tasks_select_editors
on public.event_shared_tasks
for select
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_shared_tasks_insert_editors on public.event_shared_tasks;
create policy event_shared_tasks_insert_editors
on public.event_shared_tasks
for insert
to authenticated
with check (
  public.is_event_editor(event_id, auth.uid())
  and exists (
    select 1
    from public.events e
    where e.id = event_shared_tasks.event_id
      and e.host_user_id = event_shared_tasks.host_user_id
  )
);

drop policy if exists event_shared_tasks_update_editors on public.event_shared_tasks;
create policy event_shared_tasks_update_editors
on public.event_shared_tasks
for update
to authenticated
using (public.is_event_editor(event_id, auth.uid()))
with check (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_shared_tasks_delete_editors on public.event_shared_tasks;
create policy event_shared_tasks_delete_editors
on public.event_shared_tasks
for delete
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

commit;
