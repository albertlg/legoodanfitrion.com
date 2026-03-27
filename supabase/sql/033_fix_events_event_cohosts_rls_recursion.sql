-- =====================================================
-- 033_fix_events_event_cohosts_rls_recursion.sql
-- Hotfix: elimina recursión infinita entre policies de
-- public.events y public.event_cohosts.
-- =====================================================

begin;

alter table public.events enable row level security;
alter table public.event_cohosts enable row level security;

-- -----------------------------------------------------
-- 1) Helpers SECURITY DEFINER (sin subqueries cruzadas en policies)
-- -----------------------------------------------------

create or replace function public.is_event_owner(
  p_event_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_id is null or p_user_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.host_user_id = p_user_id
  );
end;
$$;

revoke all on function public.is_event_owner(uuid, uuid) from public;
grant execute on function public.is_event_owner(uuid, uuid) to authenticated;

create or replace function public.is_event_cohost(
  p_event_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_id is null or p_user_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.event_cohosts ec
    where ec.event_id = p_event_id
      and ec.host_id = p_user_id
  );
end;
$$;

revoke all on function public.is_event_cohost(uuid, uuid) from public;
grant execute on function public.is_event_cohost(uuid, uuid) to authenticated;

-- Función compuesta (mantiene contrato usado en otras tablas)
create or replace function public.is_event_editor(
  p_event_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.is_event_owner(p_event_id, p_user_id)
      or public.is_event_cohost(p_event_id, p_user_id);
end;
$$;

revoke all on function public.is_event_editor(uuid, uuid) from public;
grant execute on function public.is_event_editor(uuid, uuid) to authenticated;

-- -----------------------------------------------------
-- 2) Reset policies de public.events (sin subqueries directas a event_cohosts)
-- -----------------------------------------------------

do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
  loop
    execute format('drop policy if exists %I on public.events', v_policy.policyname);
  end loop;
end
$$;

create policy events_insert_owner
on public.events
for insert
to authenticated
with check (host_user_id = auth.uid());

create policy events_select_owner_or_cohost
on public.events
for select
to authenticated
using (
  host_user_id = auth.uid()
  or public.is_event_cohost(id, auth.uid())
);

create policy events_update_owner_or_cohost
on public.events
for update
to authenticated
using (
  host_user_id = auth.uid()
  or public.is_event_cohost(id, auth.uid())
)
with check (
  host_user_id = auth.uid()
  or public.is_event_cohost(id, auth.uid())
);

create policy events_delete_owner_only
on public.events
for delete
to authenticated
using (host_user_id = auth.uid());

-- -----------------------------------------------------
-- 3) Reset policies de public.event_cohosts
--    (sin subqueries directas a events dentro de policy)
-- -----------------------------------------------------

do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_cohosts'
  loop
    execute format('drop policy if exists %I on public.event_cohosts', v_policy.policyname);
  end loop;
end
$$;

-- Ver equipo: cohost se ve a sí mismo, owner ve su equipo
create policy event_cohosts_select_member_or_owner
on public.event_cohosts
for select
to authenticated
using (
  host_id = auth.uid()
  or public.is_event_owner(event_id, auth.uid())
);

-- Gestionar equipo: solo owner del evento
create policy event_cohosts_insert_owner
on public.event_cohosts
for insert
to authenticated
with check (public.is_event_owner(event_id, auth.uid()));

create policy event_cohosts_update_owner
on public.event_cohosts
for update
to authenticated
using (public.is_event_owner(event_id, auth.uid()))
with check (public.is_event_owner(event_id, auth.uid()));

create policy event_cohosts_delete_owner
on public.event_cohosts
for delete
to authenticated
using (public.is_event_owner(event_id, auth.uid()));

commit;

