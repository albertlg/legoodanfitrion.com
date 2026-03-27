-- =====================================================
-- 030_fix_events_insert_rls.sql
-- Hotfix: garantizar INSERT en events para usuarios autenticados
-- (owner del evento = auth.uid()).
-- =====================================================

alter table public.events enable row level security;

-- Si quedó alguna policy legacy/restrictiva, la limpiamos.
drop policy if exists events_host_all on public.events;
drop policy if exists events_insert_owner on public.events;
drop policy if exists events_insert_editors on public.events;

-- Re-creamos política de INSERT explícita y simple.
create policy events_insert_owner
on public.events
for insert
to authenticated
with check (host_user_id = auth.uid());

-- Mantenemos SELECT/UPDATE/DELETE según modelo co-host.
drop policy if exists events_select_editors on public.events;
create policy events_select_editors
on public.events
for select
to authenticated
using (public.is_event_editor(id, auth.uid()));

drop policy if exists events_update_editors on public.events;
create policy events_update_editors
on public.events
for update
to authenticated
using (public.is_event_editor(id, auth.uid()))
with check (public.is_event_editor(id, auth.uid()));

drop policy if exists events_delete_owner_only on public.events;
create policy events_delete_owner_only
on public.events
for delete
to authenticated
using (host_user_id = auth.uid());
