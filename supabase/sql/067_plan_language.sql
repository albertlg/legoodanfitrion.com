-- Add plan_language column to event_host_plans and update unique constraint
-- to allow one plan per (event, host, language).

alter table public.event_host_plans
  add column if not exists plan_language text not null default 'es';

-- Backfill any existing rows (already default 'es' from above, but explicit)
update public.event_host_plans set plan_language = 'es' where plan_language is null;

-- Drop old 2-column unique constraint
alter table public.event_host_plans
  drop constraint if exists event_host_plans_event_host_unique;

-- New 3-column unique: one plan per event+host+language
alter table public.event_host_plans
  add constraint event_host_plans_event_host_lang_unique
  unique (event_id, host_user_id, plan_language);

-- Index for querying plans by host+language
create index if not exists idx_event_host_plans_host_lang
  on public.event_host_plans(host_user_id, plan_language);

-- Drop old 5-param function
drop function if exists public.upsert_event_host_plan(uuid, jsonb, jsonb, text, jsonb);

-- New 6-param function that includes plan_language
create or replace function public.upsert_event_host_plan(
  p_event_id      uuid,
  p_plan_json     jsonb,
  p_context_json  jsonb    default '{}'::jsonb,
  p_scope         text     default 'all',
  p_model_meta    jsonb    default '{}'::jsonb,
  p_plan_language text     default 'es'
)
returns table (
  event_id      uuid,
  version       integer,
  generated_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid        := auth.uid();
  v_lang         text        := coalesce(nullif(trim(p_plan_language), ''), 'es');
  v_next_version integer     := 1;
  v_generated_at timestamptz := timezone('utc', now());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_event_id is null then
    raise exception 'event_id is required';
  end if;

  if p_plan_json is null then
    raise exception 'plan_json is required';
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.host_user_id = v_user_id
  ) then
    raise exception 'event_not_owned';
  end if;

  -- Next version = max version for this event+host (across all languages) + 1
  select coalesce(max(ehp.version), 0) + 1
    into v_next_version
  from public.event_host_plans ehp
  where ehp.event_id    = p_event_id
    and ehp.host_user_id = v_user_id;

  insert into public.event_host_plans as ehp (
    host_user_id,
    event_id,
    plan_language,
    version,
    generated_at,
    source,
    plan_context,
    plan_snapshot,
    model_meta
  ) values (
    v_user_id,
    p_event_id,
    v_lang,
    v_next_version,
    v_generated_at,
    'local_heuristic',
    coalesce(p_context_json, '{}'::jsonb),
    p_plan_json,
    coalesce(p_model_meta, '{}'::jsonb) || jsonb_build_object('scope', coalesce(nullif(trim(p_scope), ''), 'all'))
  )
  on conflict on constraint event_host_plans_event_host_lang_unique
  do update set
    version       = excluded.version,
    generated_at  = excluded.generated_at,
    source        = excluded.source,
    plan_context  = excluded.plan_context,
    plan_snapshot = excluded.plan_snapshot,
    model_meta    = excluded.model_meta,
    updated_at    = timezone('utc', now());

  return query
  select p_event_id, v_next_version, v_generated_at;
end;
$$;

revoke all on function public.upsert_event_host_plan(uuid, jsonb, jsonb, text, jsonb, text) from public;
grant execute on function public.upsert_event_host_plan(uuid, jsonb, jsonb, text, jsonb, text) to authenticated;
