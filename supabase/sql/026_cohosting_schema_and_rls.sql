-- =====================================================
-- 026_cohosting_schema_and_rls.sql
-- Co-Hosting: esquema + función de autorización + RLS event-scoped
-- =====================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------
-- 1) Tabla puente de co-anfitriones
-- -----------------------------------------------------
create table if not exists public.event_cohosts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('editor')),
  created_at timestamptz not null default now(),
  constraint event_cohosts_unique_event_host unique (event_id, host_id)
);

create index if not exists idx_event_cohosts_event_id on public.event_cohosts(event_id);
create index if not exists idx_event_cohosts_host_id on public.event_cohosts(host_id);

alter table public.event_cohosts enable row level security;

-- El creador original del evento puede gestionar sus co-hosts
drop policy if exists event_cohosts_creator_manage on public.event_cohosts;
create policy event_cohosts_creator_manage
on public.event_cohosts
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_cohosts.event_id
      and e.host_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_cohosts.event_id
      and e.host_user_id = auth.uid()
  )
);

-- El co-host puede verse a sí mismo (solo lectura de su propio vínculo)
drop policy if exists event_cohosts_member_select_self on public.event_cohosts;
create policy event_cohosts_member_select_self
on public.event_cohosts
for select
to authenticated
using (host_id = auth.uid());

-- -----------------------------------------------------
-- 2) Motor de autorización reutilizable
-- -----------------------------------------------------
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
  if p_event_id is null or p_user_id is null then
    return false;
  end if;

  return exists (
      select 1
      from public.events e
      where e.id = p_event_id
        and e.host_user_id = p_user_id
    )
    or exists (
      select 1
      from public.event_cohosts ec
      where ec.event_id = p_event_id
        and ec.host_id = p_user_id
    );
end;
$$;

revoke all on function public.is_event_editor(uuid, uuid) from public;
grant execute on function public.is_event_editor(uuid, uuid) to authenticated;

-- Blindaje: el propietario original del evento no se puede cambiar por UPDATE.
create or replace function public.prevent_event_owner_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.host_user_id is distinct from old.host_user_id then
    raise exception 'event_owner_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_events_prevent_owner_change on public.events;
create trigger trg_events_prevent_owner_change
before update on public.events
for each row execute function public.prevent_event_owner_change();

-- -----------------------------------------------------
-- 3) Reemplazo de políticas RLS (event-scoped)
--    Pasamos de "host_user_id = auth.uid()" a is_event_editor(...)
-- -----------------------------------------------------

-- 3.1 events
drop policy if exists events_host_all on public.events;
drop policy if exists events_select_editors on public.events;
drop policy if exists events_insert_owner on public.events;
drop policy if exists events_update_editors on public.events;
drop policy if exists events_delete_editors on public.events;
drop policy if exists events_delete_owner_only on public.events;

create policy events_select_editors
on public.events
for select
to authenticated
using (public.is_event_editor(id, auth.uid()));

create policy events_insert_owner
on public.events
for insert
to authenticated
with check (host_user_id = auth.uid());

create policy events_update_editors
on public.events
for update
to authenticated
using (public.is_event_editor(id, auth.uid()))
with check (public.is_event_editor(id, auth.uid()));

create policy events_delete_owner_only
on public.events
for delete
to authenticated
using (host_user_id = auth.uid());

-- 3.2 invitations
drop policy if exists invitations_host_all on public.invitations;
drop policy if exists invitations_editors_all on public.invitations;

create policy invitations_editors_all
on public.invitations
for all
to authenticated
using (public.is_event_editor(event_id, auth.uid()))
with check (
  public.is_event_editor(event_id, auth.uid())
  and exists (
    select 1
    from public.events e
    where e.id = invitations.event_id
      and e.host_user_id = invitations.host_user_id
  )
);

-- 3.3 expenses (legacy tabla relacional)
drop policy if exists expenses_host_all on public.expenses;
drop policy if exists expenses_editors_all on public.expenses;

create policy expenses_editors_all
on public.expenses
for all
to authenticated
using (public.is_event_editor(event_id, auth.uid()))
with check (
  public.is_event_editor(event_id, auth.uid())
  and exists (
    select 1
    from public.events e
    where e.id = expenses.event_id
      and e.host_user_id = expenses.host_user_id
  )
);

-- 3.4 expense_shares (legacy tabla relacional ligada a expenses)
drop policy if exists expense_shares_host_all on public.expense_shares;
drop policy if exists expense_shares_editors_all on public.expense_shares;

create policy expense_shares_editors_all
on public.expense_shares
for all
to authenticated
using (
  exists (
    select 1
    from public.expenses ex
    where ex.id = expense_shares.expense_id
      and public.is_event_editor(ex.event_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.expenses ex
    where ex.id = expense_shares.expense_id
      and ex.host_user_id = expense_shares.host_user_id
      and public.is_event_editor(ex.event_id, auth.uid())
  )
);

-- 3.5 event_host_plans
drop policy if exists event_host_plans_host_all on public.event_host_plans;
drop policy if exists event_host_plans_editors_all on public.event_host_plans;

create policy event_host_plans_editors_all
on public.event_host_plans
for all
to authenticated
using (public.is_event_editor(event_id, auth.uid()))
with check (
  public.is_event_editor(event_id, auth.uid())
  and exists (
    select 1
    from public.events e
    where e.id = event_host_plans.event_id
      and e.host_user_id = event_host_plans.host_user_id
  )
);

-- 3.6 event_date_options
drop policy if exists event_date_options_host_all on public.event_date_options;
drop policy if exists event_date_options_editors_all on public.event_date_options;

create policy event_date_options_editors_all
on public.event_date_options
for all
to authenticated
using (public.is_event_editor(event_id, auth.uid()))
with check (
  public.is_event_editor(event_id, auth.uid())
  and exists (
    select 1
    from public.events e
    where e.id = event_date_options.event_id
      and e.host_user_id = event_date_options.host_user_id
  )
);

-- 3.7 event_date_votes
drop policy if exists event_date_votes_host_all on public.event_date_votes;
drop policy if exists event_date_votes_editors_all on public.event_date_votes;

create policy event_date_votes_editors_all
on public.event_date_votes
for all
to authenticated
using (public.is_event_editor(event_id, auth.uid()))
with check (
  public.is_event_editor(event_id, auth.uid())
  and exists (
    select 1
    from public.events e
    where e.id = event_date_votes.event_id
      and e.host_user_id = event_date_votes.host_user_id
  )
);
