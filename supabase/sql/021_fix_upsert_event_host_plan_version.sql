-- Patch: ensure upsert_event_host_plan always writes a non-null version
-- and keeps source aligned with planner metadata when provided.

create or replace function public.upsert_event_host_plan(
  p_event_id uuid,
  p_plan_json jsonb,
  p_context_json jsonb default '{}'::jsonb,
  p_scope text default 'all',
  p_model_meta jsonb default '{}'::jsonb
)
returns table (
  event_id uuid,
  version integer,
  generated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_next_version integer;
  v_generated_at timestamptz := timezone('utc', now());
  v_source text := coalesce(
    nullif(trim(coalesce(p_model_meta ->> 'source', '')), ''),
    'local_heuristic'
  );
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

  select coalesce(max(ehp.version), 0) + 1
    into v_next_version
  from public.event_host_plans ehp
  where ehp.event_id = p_event_id
    and ehp.host_user_id = v_user_id;

  if v_next_version is null then
    v_next_version := 1;
  end if;

  insert into public.event_host_plans as ehp (
    host_user_id,
    event_id,
    version,
    generated_at,
    source,
    plan_context,
    plan_snapshot,
    model_meta
  ) values (
    v_user_id,
    p_event_id,
    v_next_version,
    v_generated_at,
    v_source,
    coalesce(p_context_json, '{}'::jsonb),
    p_plan_json,
    coalesce(p_model_meta, '{}'::jsonb) || jsonb_build_object('scope', coalesce(nullif(trim(p_scope), ''), 'all'))
  )
  on conflict on constraint event_host_plans_event_host_unique
  do update set
    version = excluded.version,
    generated_at = excluded.generated_at,
    source = excluded.source,
    plan_context = excluded.plan_context,
    plan_snapshot = excluded.plan_snapshot,
    model_meta = excluded.model_meta,
    updated_at = timezone('utc', now());

  return query
  select p_event_id, v_next_version, v_generated_at;
end;
$$;

revoke all on function public.upsert_event_host_plan(uuid, jsonb, jsonb, text, jsonb) from public;
grant execute on function public.upsert_event_host_plan(uuid, jsonb, jsonb, text, jsonb) to authenticated;
