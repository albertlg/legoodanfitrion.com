-- =====================================================
-- 031_events_insert_owner_from_auth_trigger.sql
-- Hotfix robusto para INSERT en events:
-- - Fuerza host_user_id desde auth.uid() en DB (no depende del frontend)
-- - Simplifica policy de INSERT para authenticated
-- =====================================================

-- 1) Trigger function: si hay sesión auth, fija el owner automáticamente.
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

-- 2) RLS INSERT policy: permitir insertar a cualquier authenticated.
--    El trigger anterior ya fija host_user_id al auth.uid().
alter table public.events enable row level security;

drop policy if exists events_insert_owner on public.events;
drop policy if exists events_insert_authenticated on public.events;

create policy events_insert_authenticated
on public.events
for insert
to authenticated
with check (auth.uid() is not null);
