-- =====================================================
-- 032_fix_events_rls_postgrest_insert_select.sql
-- Fix robusto para eventos:
-- - Evita recursión/ambigüedad en SELECT policy de events
-- - Garantiza INSERT + `?select=id` (PostgREST) para owner
-- - Mantiene acceso de co-host (editor) en SELECT/UPDATE
-- =====================================================

begin;

alter table public.events enable row level security;

-- 1) Limpiar TODAS las policies existentes en events (por nombre dinámico)
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

-- 2) Trigger para forzar owner desde sesión auth (idempotente)
create or replace function public.set_event_owner_from_auth()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.host_user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_events_set_owner_from_auth on public.events;
create trigger trg_events_set_owner_from_auth
before insert on public.events
for each row execute function public.set_event_owner_from_auth();

-- 3) Policies canónicas (sin función recursiva sobre events)
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
  or exists (
    select 1
    from public.event_cohosts ec
    where ec.event_id = events.id
      and ec.host_id = auth.uid()
  )
);

create policy events_update_owner_or_cohost
on public.events
for update
to authenticated
using (
  host_user_id = auth.uid()
  or exists (
    select 1
    from public.event_cohosts ec
    where ec.event_id = events.id
      and ec.host_id = auth.uid()
  )
)
with check (
  host_user_id = auth.uid()
  or exists (
    select 1
    from public.event_cohosts ec
    where ec.event_id = events.id
      and ec.host_id = auth.uid()
  )
);

create policy events_delete_owner_only
on public.events
for delete
to authenticated
using (host_user_id = auth.uid());

commit;

