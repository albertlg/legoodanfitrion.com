create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create table if not exists public.event_host_plans (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  version integer not null default 1 check (version > 0),
  generated_at timestamptz not null default timezone('utc', now()),
  source text not null default 'local_heuristic',
  plan_context jsonb not null default '{}'::jsonb,
  plan_snapshot jsonb not null default '{}'::jsonb,
  model_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint event_host_plans_event_fk
    foreign key (event_id, host_user_id)
    references public.events(id, host_user_id)
    on delete cascade,
  constraint event_host_plans_event_host_unique unique (event_id, host_user_id)
);

create index if not exists idx_event_host_plans_host on public.event_host_plans(host_user_id);
create index if not exists idx_event_host_plans_generated_at on public.event_host_plans(generated_at desc);

drop trigger if exists trg_event_host_plans_set_updated_at on public.event_host_plans;
create trigger trg_event_host_plans_set_updated_at
before update on public.event_host_plans
for each row execute procedure public.handle_updated_at();

alter table public.event_host_plans enable row level security;

drop policy if exists event_host_plans_host_all on public.event_host_plans;
create policy event_host_plans_host_all
on public.event_host_plans for all
using (auth.uid() = host_user_id)
with check (auth.uid() = host_user_id);

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
  v_next_version integer := 1;
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

  select coalesce(ehp.version, 0) + 1
    into v_next_version
  from public.event_host_plans ehp
  where ehp.event_id = p_event_id
    and ehp.host_user_id = v_user_id;

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
    'local_heuristic',
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
