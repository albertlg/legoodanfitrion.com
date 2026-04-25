-- 060_guest_ai_plan_public.sql
--
-- Expone un subconjunto público y seguro del plan_snapshot del anfitrión
-- a los invitados anónimos, a través del token de invitación.
--
-- INCLUYE (campos públicos):
--   plan_version, generated_at, source
--   dress_code     → plan_snapshot.context.dressCode
--   moment_key     → plan_snapshot.context.momentKey
--   tone_key       → plan_snapshot.context.toneKey
--   timeline       → plan_snapshot.sections.timings.timeline
--   ambience_hints → plan_snapshot.sections.ambience.ambience
--   conversation_starters → plan_snapshot.sections.ambience.conversation
--   menu_context   → plan_snapshot.sections.menu.contextSummary
--
-- EXCLUYE explícitamente (datos privados del anfitrión):
--   context.budgetKey, context.hostPreferences, context.guestSignals
--   sections.shopping  → costes y listas de compra
--   sections.communication → borradores de mensajes al invitado
--   sections.risks     → contingencias internas
--   sections.menu.recipeCards / shoppingGroups / estimatedCost
--   alerts, seeds, model_meta, context_overrides

drop function if exists public.get_invitation_plan_public(text);

create or replace function public.get_invitation_plan_public(p_token text)
returns table (
  plan_version  integer,
  generated_at  timestamptz,
  source        text,
  dress_code    text,
  moment_key    text,
  tone_key      text,
  timeline      jsonb,
  ambience_hints        jsonb,
  conversation_starters jsonb,
  menu_context  text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id      uuid;
  v_host_user_id  uuid;
  v_snap          jsonb;
begin
  -- Resuelve el event_id y host_user_id a partir del token
  select i.event_id, i.host_user_id
    into v_event_id, v_host_user_id
  from public.invitations i
  join public.events e
    on e.id = i.event_id
   and e.host_user_id = i.host_user_id
  where i.public_token = p_token
    and e.status <> 'cancelled'
  limit 1;

  if v_event_id is null then
    return;
  end if;

  -- Lee el último plan del anfitrión (existe, o vacío)
  select ehp.plan_snapshot
    into v_snap
  from public.event_host_plans ehp
  where ehp.event_id = v_event_id
    and ehp.host_user_id = v_host_user_id
  limit 1;

  -- Si no hay plan generado, devuelve un resultado vacío en lugar de nulo
  if v_snap is null then
    return;
  end if;

  return query
  select
    coalesce((v_snap ->> 'version')::integer, 1)                             as plan_version,
    coalesce(
      (v_snap ->> 'generated_at')::timestamptz,
      timezone('utc', now())
    )                                                                          as generated_at,
    coalesce(v_snap ->> 'source', 'local_heuristic')                         as source,
    coalesce(v_snap -> 'context' ->> 'dressCode', 'none')                    as dress_code,
    coalesce(v_snap -> 'context' ->> 'momentKey', 'evening')                 as moment_key,
    coalesce(v_snap -> 'context' ->> 'toneKey', 'casual')                    as tone_key,
    coalesce(v_snap -> 'sections' -> 'timings' -> 'timeline', '[]'::jsonb)   as timeline,
    coalesce(v_snap -> 'sections' -> 'ambience' -> 'ambience', '[]'::jsonb)  as ambience_hints,
    coalesce(v_snap -> 'sections' -> 'ambience' -> 'conversation', '[]'::jsonb) as conversation_starters,
    coalesce(v_snap -> 'sections' -> 'menu' ->> 'contextSummary', '')        as menu_context;
end;
$$;

revoke all on function public.get_invitation_plan_public(text) from public;
grant execute on function public.get_invitation_plan_public(text) to anon, authenticated;

comment on function public.get_invitation_plan_public(text) is
  'Devuelve el subconjunto público del plan IA del anfitrión para el asistente del invitado.
   Excluye: presupuesto, compras, costes, borradores de mensajes, contingencias y señales de otros invitados.';


-- ===========================================================================
-- Tabla guest_ai_insights: bucle de feedback invitado → anfitrión
-- ===========================================================================

create table if not exists public.guest_ai_insights (
  id                uuid        primary key default gen_random_uuid(),
  event_id          uuid        not null,
  invitation_token  text        not null,
  question          text        not null check (char_length(question) <= 500),
  detected_intent   text        not null default 'unknown',
  created_at        timestamptz not null default timezone('utc', now())
);

create index if not exists idx_guest_ai_insights_event
  on public.guest_ai_insights (event_id);

create index if not exists idx_guest_ai_insights_created
  on public.guest_ai_insights (created_at desc);

alter table public.guest_ai_insights enable row level security;

-- Invitados (anon) pueden insertar pero NO leer
drop policy if exists guest_ai_insights_anon_insert on public.guest_ai_insights;
create policy guest_ai_insights_anon_insert
  on public.guest_ai_insights for insert
  to anon, authenticated
  with check (true);

-- El anfitrión puede leer las insights de sus propios eventos
drop policy if exists guest_ai_insights_host_select on public.guest_ai_insights;
create policy guest_ai_insights_host_select
  on public.guest_ai_insights for select
  using (
    exists (
      select 1
      from public.events e
      where e.id = guest_ai_insights.event_id
        and e.host_user_id = auth.uid()
    )
  );


-- RPC anon-safe para loguear preguntas del asistente del invitado
drop function if exists public.log_guest_ai_insight(text, text, text);

create or replace function public.log_guest_ai_insight(
  p_token    text,
  p_question text,
  p_intent   text default 'unknown'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  select i.event_id
    into v_event_id
  from public.invitations i
  join public.events e
    on e.id = i.event_id
   and e.host_user_id = i.host_user_id
  where i.public_token = p_token
    and e.status <> 'cancelled'
  limit 1;

  if v_event_id is null then
    return;
  end if;

  insert into public.guest_ai_insights (event_id, invitation_token, question, detected_intent)
  values (v_event_id, p_token, left(trim(p_question), 500), coalesce(nullif(trim(p_intent), ''), 'unknown'));
end;
$$;

revoke all on function public.log_guest_ai_insight(text, text, text) from public;
grant execute on function public.log_guest_ai_insight(text, text, text) to anon, authenticated;

comment on function public.log_guest_ai_insight(text, text, text) is
  'Registra la pregunta de un invitado al asistente IA para que el anfitrión
   pueda ver qué dudas surgen y mejorar la información del evento.';
