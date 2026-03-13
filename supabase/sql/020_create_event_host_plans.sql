-- Legacy compatibility patch
-- The canonical migration for Host Plans is:
--   018_event_host_plans.sql
--
-- This script intentionally avoids recreating the table/RPC to prevent overlap
-- when environments run every SQL file in numeric order.

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Ensure trigger points to the shared updated_at function when table exists.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'event_host_plans'
  ) then
    execute 'drop trigger if exists trg_event_host_plans_set_updated_at on public.event_host_plans';
    execute 'create trigger trg_event_host_plans_set_updated_at
      before update on public.event_host_plans
      for each row execute procedure public.handle_updated_at()';
  end if;
end;
$$;
